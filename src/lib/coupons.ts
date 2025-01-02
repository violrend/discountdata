export interface CouponJSON {
	id: number;
	createdAt: string;
	code: string;
	url: string;
	amount: string;
	up_votes: string[];
	down_votes: string[];
}

export class Coupon {
	id: number;
	createdAt: Date;
	code: string;
	url: string;
	amount: string;
	up_votes: Date[];
	down_votes: Date[];

	constructor(id: number, code: string, url: string, amount: string) {
		this.id = id;
		this.createdAt = new Date();
		this.code = code;
		this.url = url;
		this.amount = amount;
		this.up_votes = [];
		this.down_votes = [];
	}

	importFromJSON(json: CouponJSON) {
		this.id = json.id;
		this.createdAt = new Date(json.createdAt);
		this.code = json.code;
		this.url = json.url;
		this.amount = json.amount;
		this.up_votes = json.up_votes.map((date: string) => new Date(date));
		this.down_votes = json.down_votes.map((date: string) => new Date(date));
	}

	getScore(): number {
		// This is not the final score calculation
		return this.up_votes.length - this.down_votes.length;
	}

	getVoteScore(): number {
		return this.up_votes.length - this.down_votes.length;
	}
}

export type SortOptions = "newest" | "oldest" | "most_votes" | "least_votes" | "highest_score" | "lowest_score" | "amount_desc" | "amount_asc";

export const sortOptionNames: Record<SortOptions, string> = {
	newest: "Newest",
	oldest: "Oldest",
	most_votes: "Most Votes",
	least_votes: "Least Votes",
	highest_score: "Highest Score",
	lowest_score: "Lowest Score",
	amount_desc: "Amount Descending",
	amount_asc: "Amount Ascending",
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
		case 'amount_desc':
			// since amount can be percentage or dollar amount,
			// we just sort by the number value
			return filteredCoupons.sort((a, b) => {
				const aAmount = parseInt(a.amount.replace(/\D/g, ''));
				const bAmount = parseInt(b.amount.replace(/\D/g, ''));
				return bAmount - aAmount;
			});
		case 'amount_asc':
			return filteredCoupons.sort((a, b) => {
				const aAmount = parseInt(a.amount.replace(/\D/g, ''));
				const bAmount = parseInt(b.amount.replace(/\D/g, ''));
				return aAmount - bAmount;
			});
		default:
			return filteredCoupons;
	}
}
