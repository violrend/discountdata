<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { type Coupon, sort, sortOptionNames, sortOptions, type SortOptions } from '$lib/coupons';
	import { generateCoupons } from '$lib/generator';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import * as Tooltip from "$lib/components/ui/tooltip/index";
	import * as Select from "$lib/components/ui/select/index";

	const coupons: Coupon[] = generateCoupons(30);


	const searchValue = writable<string>('');
	const sortBy = writable<SortOptions>('highest_score');

	const sortedCoupons = writable<Coupon[]>([]);

	function sortCoupons() {
		try {
			sortedCoupons.set(sort(
				coupons,
				$searchValue,
				$sortBy
			));
		} catch (e) {
			console.log(e);
		}
	}

	onMount(() => {
		sortCoupons();

		searchValue.subscribe(() => {
			sortCoupons();
		});

		sortBy.subscribe(() => {
			sortCoupons();
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
					<Select.Item value={option} >
						{sortOptionNames[option]}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<ScrollArea class="w-full h-full space-y-5">
		<div class="px-4 space-y-2">
			{#each $sortedCoupons as coupon}
				<div class="w-full h-24 rounded-md border p-5 flex flex-col justify-around bg-background">
					<div class="w-full flex justify-between text-xl font-semibold">
						<Tooltip.Provider delayDuration={100} disableCloseOnTriggerClick={true}>
							<Tooltip.Root bind:open={$openTooltips[coupon.id]}>
								<Tooltip.Trigger>
									<button onclick={() => {copyToClipboard(coupon)}} class="hover:text-green-500 duration-100">
										{coupon.code}
									</button>
								</Tooltip.Trigger>
								<Tooltip.Content side="right">
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
						<h3>
							{coupon.amount}
						</h3>
					</div>
					<div class="w-full flex justify-between text-sm">
						<a href="https://{coupon.url}" target="_blank" class="hover:text-blue-400 hover:opacity-100 opacity-60 duration-100 max-w-[50%] truncate">
							{coupon.url}
						</a>
						<p class="opacity-60">
							Score: {coupon.getScore()}
						</p>
					</div>
				</div>
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