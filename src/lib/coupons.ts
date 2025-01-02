export interface CouponJSON {
	id: number;
	created_at: string;
	code: string;
	url: string;
	up_votes: string[];
	down_votes: string[];
	title: string;
	description: string;
}

export class Coupon {
	id: number;
	createdAt: Date;
	code: string;
	url: string;
	up_votes: Date[];
	down_votes: Date[];
	title: string;
	description: string;

	constructor(id: number, code: string, url: string, title: string, description: string) {
		this.id = id;
		this.createdAt = new Date();
		this.code = code;
		this.url = url;
		this.up_votes = [];
		this.down_votes = [];
		this.title = title;
		this.description = description;
	}

	static importFromJSON(json: CouponJSON): Coupon {
		const coupon = new Coupon(
			json.id,
			json.code,
			json.url,
			json.title,
			json.description
		);
		coupon.createdAt = new Date(json.created_at);
		coupon.up_votes = json.up_votes.map((date) => new Date(date));
		coupon.down_votes = json.down_votes.map((date) => new Date(date));
		return coupon;
	}

	getScore(): number {
		// This is not the final score calculation
		return this.up_votes.length - this.down_votes.length;
	}

	getVoteScore(): number {
		return this.up_votes.length - this.down_votes.length;
	}

	toJSON(): CouponJSON {
		return {
			id: this.id,
			created_at: this.createdAt.toISOString(),
			code: this.code,
			url: this.url,
			up_votes: this.up_votes.map((date) => date.toISOString()),
			down_votes: this.down_votes.map((date) => date.toISOString()),
			title: this.title,
			description: this.description
		};
	}
}

export type SortOptions = "newest" | "oldest" | "most_votes" | "least_votes" | "highest_score" | "lowest_score";

export const sortOptionNames: Record<SortOptions, string> = {
	newest: "Newest",
	oldest: "Oldest",
	most_votes: "Most Votes",
	least_votes: "Least Votes",
	highest_score: "Highest Score",
	lowest_score: "Lowest Score",
}

export const sortOptions: SortOptions[] = Object.keys(sortOptionNames) as SortOptions[];

export function sort(coupons: Coupon[], searchString: string, sortBy: SortOptions): Coupon[] {
	const cleanedSearchString = searchString.trim().toLowerCase();
	let filteredCoupons = coupons;

	if (cleanedSearchString) {
		filteredCoupons = filteredCoupons.filter((coupon) => {
			return coupon.code.toLowerCase().includes(cleanedSearchString) || coupon.url.toLowerCase().includes(cleanedSearchString);
		});
	}

	switch (sortBy) {
		case 'newest':
			return filteredCoupons.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		case 'oldest':
			return filteredCoupons.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		case 'most_votes':
			return filteredCoupons.sort((a, b) => b.getVoteScore() - a.getVoteScore());
		case 'least_votes':
			return filteredCoupons.sort((a, b) => a.getVoteScore() - b.getVoteScore());
		case 'highest_score':
			return filteredCoupons.sort((a, b) => b.getScore() - a.getScore());
		case 'lowest_score':
			return filteredCoupons.sort((a, b) => a.getScore() - b.getScore());
		default:
			return filteredCoupons;
	}
}

export async function fetchCoupons(
	search: string,
	sortBy: SortOptions,
	limit: number,
	offset: number
): Promise<Coupon[]> {
	// GET /api/coupons?search=string&sort=string&limit=number&offset=number
	const res = await fetch(`/api/coupons?search=${search}&sort=${sortBy}&limit=${limit}&offset=${offset}`);

	if (!res.ok) {
		throw new Error(`Failed to fetch coupons: ${res.statusText}`);
	}

	const coupons = await res.json();
	return coupons.map(Coupon.importFromJSON);
}
