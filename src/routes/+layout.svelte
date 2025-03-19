<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';

	let { children } = $props();
</script>

<ModeWatcher />

<div
	class="absolute inset-0 w-full h-full"
	style="background-image: radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.1) 1px, transparent 0); background-size: 30px 30px;"
></div>

<div class="grid grid-rows-[auto_1fr] absolute top-0 left-0 w-screen h-screen">
	<div class="w-full h-20 p-2">
		<div class="w-full">
			<div class="h-20 w-full flex justify-between items-center p-5 max-w-6xl mx-auto">
				<div class="flex items-end">
					<h1 class="text-2xl font-semibold">DiscountDB</h1>
					<div class="pl-10">
						
					</div>
				</div>
				<div>
					
				</div>
			</div>
		</div>
	</div>
	<div class="p-5 h-full w-full overflow-auto">
		{@render children()}
	</div>
</div>
