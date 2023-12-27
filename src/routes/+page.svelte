<script>
	import { Octokit } from '@octokit/rest';
	import { onMount } from 'svelte';
	/** @type {import('./$types').PageData} */
	export let data;
	const { owner, repo } = data;

	/**
	 * @type {any[] | null}
	 */
	let remote_files = null;
	/**
	 * @type {any[] | null}
	 */
	let local_files = null;
	const api = new Octokit();

	/**
	 * @type {FileSystemDirectoryHandle}
	 */
	let dirHandle;

	/**
	 * @param {any} dirHandle
	 * @param {any} path
	 */
	async function walkLocal(dirHandle, path) {
		for await (const [name, handle] of dirHandle) {
			const subpath = path ? `${path}/${name}` : name;
			if (handle.kind == 'directory') {
				await walkLocal(handle, subpath);
			} else {
				local_files?.push({ handle, subpath });
				local_files?.sort((a, b) => a.subpath.localeCompare(b.subpath));
				local_files = local_files;
			}
		}
	}

	async function onOpenLocal() {
		/** @type {FileSystemDirectoryHandle} */
		// @ts-ignore
		dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
		local_files = [];
		await walkLocal(dirHandle, '');
	}

	/**
	 * @param {string} owner
	 * @param {string} repo
	 * @param {string} path
	 */
	async function walkRepo(owner, repo, path) {
		let content = await api.rest.repos.getContent({ owner, repo, path });
		// @ts-ignore
		for (let file of content.data) {
			const subpath = path ? `${path}/${file.name}` : file.name;
			if (file.type == 'dir') {
				await walkRepo(owner, repo, subpath);
			} else {
				remote_files?.push({ ...file, subpath });
				remote_files = remote_files;
			}
		}
	}

	async function onOpenRepo() {
		remote_files = [];
		await walkRepo(owner, repo, '');
		console.log(JSON.stringify(remote_files));
	}

	/**
	 * @param {string} path
	 * @param {any} content
	 */
	async function writeFile(path, content) {
		const parts = path.split('/');
		const dirs = parts.slice(0, parts.length - 1);
		const file = parts.slice(parts.length - 1)[0];
		let dir = dirHandle;
		for (let d of dirs) {
			dir = await dir.getDirectoryHandle(d, { create: true });
		}
		let f = await dir.getFileHandle(file, { create: true });
		let stream = await f.createWritable();
		await stream.write(content);
		await stream.close();
	}

	async function onSync() {
		for (let file of remote_files ?? []) {
			let res = await fetch(file.download_url);
			await writeFile(file.subpath, await res.blob());
		}
		await walkLocal(dirHandle, '');
	}

	onMount(() => {
		onOpenRepo();
	});
</script>

<div class="container h-full mx-auto flex flex-col justify-center items-center p-4 space-y-2">
	<div>
		<!--<button type="button" class="btn variant-ghost" on:click={onOpenRepo}>Open repo</button>-->
		{#if Array.isArray(local_files)}
			<button type="button" class="btn variant-ghost" on:click={onSync}>Sync</button>
		{:else}
			<button type="button" class="btn variant-ghost" on:click={onOpenLocal}>Open local</button>
		{/if}
	</div>
	<div class="table-container">
		{#if Array.isArray(local_files)}
			<table class="table table-hover">
				<thead>
					<tr><th>local file</th></tr>
				</thead>
				<tbody>
					{#each local_files as file}
						<tr>
							<td>{file.subpath}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
	<div class="table-container">
		{#if Array.isArray(remote_files)}
			<table class="table table-hover">
				<thead>
					<tr><th>remote file</th></tr>
				</thead>
				<tbody>
					{#each remote_files as file}
						<tr>
							<td><a href={file.download_url}>{file.subpath}</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
