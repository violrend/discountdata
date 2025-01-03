import { json, type RequestHandler } from '@sveltejs/kit';
import { type SortOptions, sortOptions } from '$lib/coupons';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
	SUPABASE_SERVICE_ROLE_KEY,
	REDIS_IP,
	REDIS_PORT,
	REDIS_USER,
	REDIS_PASS
} from '$env/static/private';
import { createClient as createRedisClient } from 'redis';

const supabase_service = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Redis client setup
const redis = createRedisClient({
	socket: {
		host: REDIS_IP || 'localhost',
		port: parseInt(REDIS_PORT || '6379')
	},
	username: REDIS_USER,
	password: REDIS_PASS
});

redis.on('error', (err) => console.error('Redis Client Error:', err));

// Connect to Redis
await redis.connect();

// Configuration
const RATE_LIMIT = 60; // requests per window
const WINDOW_S = 60; // window in seconds
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const CACHE_DURATION = 300; // 5 minutes in seconds

// Rate limiter using Redis
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
	const key = `ratelimit:${ip}`;
	const now = Math.floor(Date.now() / 1000);

	// Use Redis transaction to ensure atomicity
	const multi = redis.multi();

	// Get current count and expiry
	multi.get(key);
	multi.ttl(key);

	const [countStr, ttl] = await multi.exec();
	const count = parseInt(countStr as string) || 0;

	if (count >= RATE_LIMIT) {
		// Rate limit exceeded
		const resetTime = now + (ttl as number);
		return {
			allowed: false,
			remaining: 0,
			resetTime: resetTime * 1000
		};
	}

	// Increment counter and set expiry if it's the first request
	await redis.multi()
		.incr(key)
		.expire(key, WINDOW_S)
		.exec();

	const resetTime = now + WINDOW_S;
	const remaining = RATE_LIMIT - (count + 1);

	return {
		allowed: true,
		remaining,
		resetTime: resetTime * 1000
	};
}

// Generate cache key based on query parameters
function generateCacheKey(search: string, sortBy: string, limit: number, offset: number): string {
	return `coupons:${search}:${sortBy}:${limit}:${offset}`;
}

// Get cached data or fetch from database
async function getCouponsWithCache(search: string, sortBy: SortOptions, limit: number, offset: number) {
	const cacheKey = generateCacheKey(search, sortBy, limit, offset);

	// Try to get data from cache
	const cachedData = await redis.get(cacheKey);
	if (cachedData) {
		return { data: JSON.parse(cachedData), source: 'cache' };
	}

	// If not in cache, fetch from database
	const { data, error } = await supabase_service.rpc('get_filtered_coupons', {
		search,
		sort_by: sortBy,
		p_limit: limit,
		p_offset: offset
	});

	if (error) {
		throw new Error(error.message);
	}

	// Cache the results
	if (data) {
		await redis.setEx(cacheKey, CACHE_DURATION, JSON.stringify(data));
	}

	return { data: data ?? [], source: 'database' };
}

// GET /api/coupons?search=string&sort=string&limit=number&offset=number
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	try {
		// Check rate limit
		const clientIP = getClientAddress();
		const { allowed, remaining, resetTime } = await checkRateLimit(clientIP);

		// Set rate limit headers
		const headers = {
			'X-RateLimit-Limit': RATE_LIMIT.toString(),
			'X-RateLimit-Remaining': remaining.toString(),
			'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
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

		// Get optional query parameters
		const search: string = url.searchParams.get('search') || '';
		const sortBy: SortOptions = (url.searchParams.get('sort') || 'highest_score') as SortOptions;
		const limit: number = parseInt(url.searchParams.get('limit') || '10');
		const offset: number = parseInt(url.searchParams.get('offset') || '0');

		// Validate query parameters
		if (search.length > MAX_SEARCH_LENGTH) {
			return json(
				{ error: `Search query too long (max ${MAX_SEARCH_LENGTH} characters)` },
				{
					status: 400,
					headers
				}
			);
		}

		if (isNaN(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
			return json(
				{ error: `Invalid limit: ${limit}` },
				{
					status: 400,
					headers
				}
			);
		}

		if (isNaN(offset) || offset < 0) {
			return json(
				{ error: `Invalid offset: ${offset}` },
				{
					status: 400,
					headers
				}
			);
		}

		if (!sortOptions.includes(sortBy)) {
			return json(
				{ error: `Invalid sort option: ${sortBy}` },
				{
					status: 400,
					headers
				}
			);
		}

		// Fetch data with caching
		const { data, source } = await getCouponsWithCache(search, sortBy, limit, offset);

		return json(
			data,
			{
				headers: {
					...headers,
					'X-Cache': source
				}
			}
		);
	} catch (error) {
		console.error('API error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}