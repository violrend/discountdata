import { json, type RequestHandler } from '@sveltejs/kit';
import { Coupon, sort, type SortOptions, sortOptions } from '$lib/coupons';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase_service = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rate limiting configuration (180 requests per 15 minutes = 1 request every 5 seconds)
const RATE_LIMIT = 180; // requests per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Store IP addresses and their request counts
interface RateLimit {
	count: number;
	resetTime: number;
}

const rateLimits = new Map<string, RateLimit>();

// Clean up expired rate limits periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, limit] of rateLimits.entries()) {
		if (now > limit.resetTime) {
			rateLimits.delete(ip);
		}
	}
}, WINDOW_MS);

// Rate limiter middleware
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
	const now = Date.now();
	const limit = rateLimits.get(ip);

	if (!limit) {
		// First request from this IP
		rateLimits.set(ip, {
			count: 1,
			resetTime: now + WINDOW_MS
		});
		return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: now + WINDOW_MS };
	}

	if (now > limit.resetTime) {
		// Reset window has passed
		rateLimits.set(ip, {
			count: 1,
			resetTime: now + WINDOW_MS
		});
		return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: now + WINDOW_MS };
	}

	if (limit.count >= RATE_LIMIT) {
		// Rate limit exceeded
		return { allowed: false, remaining: 0, resetTime: limit.resetTime };
	}

	// Increment counter
	limit.count += 1;
	return { allowed: true, remaining: RATE_LIMIT - limit.count, resetTime: limit.resetTime };
}

// GET /api/coupons?search=string&sort=string&limit=number&offset=number
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// Check rate limit
	const clientIP = getClientAddress();
	const { allowed, remaining, resetTime } = checkRateLimit(clientIP);

	// Set rate limit headers
	const headers = {
		'X-RateLimit-Limit': RATE_LIMIT.toString(),
		'X-RateLimit-Remaining': remaining.toString(),
		'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
	};

	if (!allowed) {
		return json(
			{ error: 'Rate limit exceeded' },
			{
				status: 429,
				headers: {
					...headers,
					'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
				}
			}
		);
	}

	// get optional query parameters
	const search: string = url.searchParams.get('search') || '';
	const sortBy: SortOptions = (url.searchParams.get('sort') || 'highest_score') as SortOptions;
	const limit: number = parseInt(url.searchParams.get('limit') || '10');
	const offset: number = parseInt(url.searchParams.get('offset') || '0');

	if (!sortOptions.includes(sortBy)) {
		return json(
			{ error: `Invalid sort option: ${sortBy}` },
			{
				status: 400,
				headers
			}
		);
	}

	// fetch coupons from database
	// TODO: in the future, filtering and sorting should be done in the database query
	const { data, error } = await supabase_service.from('codes').select('*');
	if (error) {
		return json(
			{ error: error.message },
			{
				status: 500,
				headers
			}
		);
	}

	// import the coupons to the class
	const coupons: Coupon[] = data.map(Coupon.importFromJSON);

	// filter and sort the coupons
	const sortedCoupons = sort(coupons, search, sortBy);

	// return the paginated results
	return json(
		sortedCoupons
			.slice(offset, offset + limit)
			.map((coupon) => coupon.toJSON()),
		{ headers }
	);
};