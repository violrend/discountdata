<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import {
		type Coupon, downVoteCoupon,
		fetchCoupons,
		sortOptionNames,
		sortOptions,
		type SortOptions,
		upVoteCoupon
	} from '$lib/coupons';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { get, writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index';
	import * as Select from '$lib/components/ui/select/index';
	import * as Dialog from '$lib/components/ui/dialog/index';
	import { Button } from '$lib/components/ui/button';


	const searchValue = writable<string>('');
	const sortBy = writable<SortOptions>('high_score');

	const sortedCoupons = writable<Coupon[]>([]);

	let updateTimeout: any;

	async function updateCoupons() {
		try {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}

			updateTimeout = setTimeout(async () => {
				sortedCoupons.set((await fetchCoupons(get(searchValue), $sortBy, 10, 0)).data);
			}, 200);
		} catch (e) {
			console.log(e);
		}
	}

	onMount(async () => {
		await updateCoupons();

		searchValue.subscribe(() => {
			updateCoupons();
		});

		sortBy.subscribe(() => {
			updateCoupons();
		});
	});

	const clipboardCode = writable<string>('');

	async function copyToClipboard(coupon: Coupon) {
		try {
			await navigator.clipboard.writeText(coupon.code);
			clipboardCode.set(coupon.code);
			openTooltips.update((value) => {
				return {
					...value,
					[coupon.id]: true
				};
			});
		} catch (e) {
			console.log(e);
		}
	}

	const openTooltips = writable<Record<string, boolean>>();
	sortedCoupons.subscribe((value) => {
		if (!value) {
			return;
		}

		const newOpenTooltips: Record<number, boolean> = {};
		value.forEach((coupon) => {
			newOpenTooltips[coupon.id] = false;
		});
		openTooltips.set(newOpenTooltips);
	});

	async function upVoteCouponWrapper(couponId: number) {
		await upVoteCoupon(couponId);
		// update the coupon client side
		const updatedCoupons = get(sortedCoupons).map((coupon) => {
			if (coupon.id === couponId) {
				return {
					...coupon,
					upVotes: [...coupon.upVotes, Date.now()]
				};
			}
			return coupon;
		});
		sortedCoupons.set(updatedCoupons as Coupon[]);
	}

	async function downVoteCouponWrapper(couponId: number) {
		await downVoteCoupon(couponId);
		// update the coupon client side
		const updatedCoupons = get(sortedCoupons).map((coupon) => {
			if (coupon.id === couponId) {
				return {
					...coupon,
					downVotes: [...coupon.downVotes, Date.now()]
				};
			}
			return coupon;
		});
		sortedCoupons.set(updatedCoupons as Coupon[]);
	}
</script>

<div class="grid grid-rows-[auto_1fr] w-full h-full max-w-4xl m-auto pt-10">
	<div class="w-full md:grid md:grid-cols-[1fr_auto] md:h-20 h-28 m-auto md:space-x-2 md:space-y-0 space-y-2">
		<Input placeholder="Search for a website" class="" bind:value={$searchValue} />
		<Select.Root type="single" bind:value={$sortBy}>
			<Select.Trigger class="md:w-[180px] w-full">
				{sortOptionNames[$sortBy] ?? 'Sort by'}
			</Select.Trigger>
			<Select.Content>
				{#each sortOptions as option}
					<Select.Item value={option}>
						{sortOptionNames[option]}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<ScrollArea class="w-full h-full space-y-5">
		<div class="px-4 space-y-2">
			{#each $sortedCoupons as coupon}
				<div class="w-full md:h-36 h-48 rounded-md border p-5 flex flex-col justify-around bg-background">
					<div class="grid md:grid-cols-4 grid-cols-1 space-y-2 md:space-y-0">
						<div class="w-full flex flex-col items-start col-span-3">
							<h3 class="text-xl font-semibold">
								{coupon.title}
							</h3>
							<p class="opacity-60 text-sm">
								{coupon.description}
							</p>
						</div>
						<div class="w-full flex flex-col md:items-end">
							<div class="md:text-xl font-semibold">
								<Tooltip.Provider delayDuration={100} disableCloseOnTriggerClick={true}>
									<Tooltip.Root bind:open={$openTooltips[coupon.id]}>
										<Tooltip.Trigger>
											<button onclick={() => {copyToClipboard(coupon)}} class="hover:text-green-500 duration-100">
												{coupon.code}
											</button>
										</Tooltip.Trigger>
										<Tooltip.Content side="left">
											{#if $clipboardCode === coupon.code}
												<p>
													Copied!
												</p>
											{:else}
												<button onclick={() => {copyToClipboard(coupon)}}>
													Click to copy
												</button>
											{/if}
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							</div>

							<p class="opacity-60 text-sm">
								Score: {coupon.score}
							</p>
						</div>
					</div>

					<div class="w-full flex justify-between items-center">
						<a href="https://{coupon.merchantUrl}" target="_blank"
							 class="hover:text-blue-400 hover:opacity-100 opacity-60 duration-100 max-w-[50%] truncate">
							{coupon.merchantUrl}
						</a>

						<div class="pt-2 flex space-x-2 items-center">
							<div class="flex items-center space-x-1">
								<p class="text-xs">
									{coupon.upVotes.length}
								</p>
								<Button class="size-8 fill-white bg-transparent hover:bg-transparent hover:outline outline-1"
												onclick={() => {upVoteCouponWrapper(coupon.id)}}>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
										<path
											d="M8.834.066c.763.087 1.5.295 2.01.884.505.581.656 1.378.656 2.3 0 .467-.087 1.119-.157 1.637L11.328 5h1.422c.603 0 1.174.085 1.668.333.508.254.911.679 1.137 1.2.453.998.438 2.447.188 4.316l-.04.306c-.105.79-.195 1.473-.313 2.033-.131.63-.315 1.209-.668 1.672C13.97 15.847 12.706 16 11 16c-1.848 0-3.234-.333-4.388-.653-.165-.045-.323-.09-.475-.133-.658-.186-1.2-.34-1.725-.415A1.75 1.75 0 0 1 2.75 16h-1A1.75 1.75 0 0 1 0 14.25v-7.5C0 5.784.784 5 1.75 5h1a1.75 1.75 0 0 1 1.514.872c.258-.105.59-.268.918-.508C5.853 4.874 6.5 4.079 6.5 2.75v-.5c0-1.202.994-2.337 2.334-2.184ZM4.5 13.3c.705.088 1.39.284 2.072.478l.441.125c1.096.305 2.334.598 3.987.598 1.794 0 2.28-.223 2.528-.549.147-.193.276-.505.394-1.07.105-.502.188-1.124.295-1.93l.04-.3c.25-1.882.189-2.933-.068-3.497a.921.921 0 0 0-.442-.48c-.208-.104-.52-.174-.997-.174H11c-.686 0-1.295-.577-1.206-1.336.023-.192.05-.39.076-.586.065-.488.13-.97.13-1.328 0-.809-.144-1.15-.288-1.316-.137-.158-.402-.304-1.048-.378C8.357 1.521 8 1.793 8 2.25v.5c0 1.922-.978 3.128-1.933 3.825a5.831 5.831 0 0 1-1.567.81ZM2.75 6.5h-1a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h1a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
									</svg>
								</Button>
							</div>

							<div class="flex items-center space-x-1">
								<p class="text-xs">
									{coupon.downVotes.length}
								</p>
								<Button class="size-8 fill-white bg-transparent hover:bg-transparent hover:outline outline-1"
												onclick={() => {downVoteCouponWrapper(coupon.id)}}>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
										<path
											d="M7.083 15.986c-.763-.087-1.499-.295-2.011-.884-.504-.581-.655-1.378-.655-2.299 0-.468.087-1.12.157-1.638l.015-.112H3.167c-.603 0-1.174-.086-1.669-.334a2.415 2.415 0 0 1-1.136-1.2c-.454-.998-.438-2.447-.188-4.316l.04-.306C.32 4.108.41 3.424.526 2.864c.132-.63.316-1.209.669-1.672C1.947.205 3.211.053 4.917.053c1.848 0 3.234.332 4.388.652l.474.133c.658.187 1.201.341 1.726.415a1.75 1.75 0 0 1 1.662-1.2h1c.966 0 1.75.784 1.75 1.75v7.5a1.75 1.75 0 0 1-1.75 1.75h-1a1.75 1.75 0 0 1-1.514-.872c-.259.105-.59.268-.919.508-.671.491-1.317 1.285-1.317 2.614v.5c0 1.201-.994 2.336-2.334 2.183Zm4.334-13.232c-.706-.089-1.39-.284-2.072-.479l-.441-.125c-1.096-.304-2.335-.597-3.987-.597-1.794 0-2.28.222-2.529.548-.147.193-.275.505-.393 1.07-.105.502-.188 1.124-.295 1.93l-.04.3c-.25 1.882-.19 2.933.067 3.497a.923.923 0 0 0 .443.48c.208.104.52.175.997.175h1.75c.685 0 1.295.577 1.205 1.335-.022.192-.049.39-.075.586-.066.488-.13.97-.13 1.329 0 .808.144 1.15.288 1.316.137.157.401.303 1.048.377.307.035.664-.237.664-.693v-.5c0-1.922.978-3.127 1.932-3.825a5.878 5.878 0 0 1 1.568-.809Zm1.75 6.798h1a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-1a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25Z"></path>
									</svg>
								</Button>
							</div>
						</div>
					</div>
				</div>
				<Dialog.Root>
					<Dialog.Content>
						<Dialog.Title>
							{coupon.code}
						</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			{/each}
			{#if $sortedCoupons.length === 0}
				<div class="w-full h-24 rounded-md border p-5 flex justify-center items-center bg-background">
					<p>
						No coupons found
					</p>
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>