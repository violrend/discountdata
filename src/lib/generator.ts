import { Coupon } from './coupons';

const STORE_DOMAINS = [
	'amazon.com',
	'walmart.com',
	'target.com',
	'bestbuy.com',
	'macys.com',
	'kohls.com',
	'nike.com',
	'newegg.com'
];

const DISCOUNT_TYPES = [
	{ prefix: 'SAVE', amounts: ['10OFF', '20OFF', '30OFF', '50OFF', '100OFF'] },
	{ prefix: 'EXTRA', amounts: ['5PCT', '10PCT', '15PCT', '20PCT', '25PCT'] },
	{ prefix: 'SEASON', amounts: ['SPRING', 'SUMMER', 'FALL', 'WINTER'] },
	{ prefix: 'HOLIDAY', amounts: ['2024', 'DEALS', 'SPECIAL'] }
];

function generateRandomCode(): string {
	// Select random type and amount
	const type = DISCOUNT_TYPES[Math.floor(Math.random() * DISCOUNT_TYPES.length)];
	const amount = type.amounts[Math.floor(Math.random() * type.amounts.length)];

	// Generate random alphanumeric characters
	const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();

	return `${type.prefix}${randomChars}${amount}`;
}

function generateRandomAmount(): string {
	const isPercentage = Math.random() > 0.5;
	if (isPercentage) {
		const percentage = [5, 10, 15, 20, 25, 30, 40, 50][Math.floor(Math.random() * 8)];
		return `${percentage}%`;
	} else {
		const amount = [5, 10, 15, 20, 25, 30, 50, 100][Math.floor(Math.random() * 8)];
		return `$${amount}`;
	}
}

function generateRandomUrl(): string {
	const domain = STORE_DOMAINS[Math.floor(Math.random() * STORE_DOMAINS.length)];
	return `https://www.${domain}/promotions/${Math.random().toString(36).substring(2, 8)}`;
}

function generateRandomVotes(startDate: Date, maxVotes: number): Date[] {
	const votes: Date[] = [];
	const numVotes = Math.floor(Math.random() * maxVotes);

	for (let i = 0; i < numVotes; i++) {
		const randomOffset = Math.floor(Math.random() * (Date.now() - startDate.getTime()));
		votes.push(new Date(startDate.getTime() + randomOffset));
	}

	return votes.sort((a, b) => a.getTime() - b.getTime());
}

export function generateCoupons(count: number): Coupon[] {
	const coupons: Coupon[] = [];

	for (let i = 0; i < count; i++) {
		const coupon = new Coupon(
			i + 1,
			generateRandomCode(),
			generateRandomUrl(),
			generateRandomAmount()
		);

		// Generate some random votes
		coupon.up_votes = generateRandomVotes(coupon.createdAt, 50);
		coupon.down_votes = generateRandomVotes(coupon.createdAt, 20);

		coupons.push(coupon);
	}

	return coupons;
}

// Example usage:
// const testCoupons = generateCoupons(10);
// console.log(testCoupons);