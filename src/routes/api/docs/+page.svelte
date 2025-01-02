<script lang="ts">
	import { onMount } from 'svelte';
	import * as swaggerJson from './swagger.json';
	import SwaggerUI from 'swagger-ui';
	import 'swagger-ui/dist/swagger-ui.css';

	onMount(async () => {
		SwaggerUI({
			spec: swaggerJson,
			dom_id: '#swagger-ui-container',
		});
	});
</script>

<svelte:head>
	<title>Swagger Docs</title>
</svelte:head>

<div class="absolute w-screen h-screen top-0 left-0 z-10 bg-white overflow-auto">
	<div id="swagger-ui-container"></div>
</div>