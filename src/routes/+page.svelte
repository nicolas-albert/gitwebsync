<script>
	import { Octokit } from '@octokit/rest';
	import { onMount } from 'svelte';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	/** @type {import('./$types').PageData} */
	export let data;
	const { owner, repo } = data;

	let loading = false;
	/**
	 * @type {any[] | null}
	 */
	let remote_files = null;
	/**
	 * @type {any}
	 */
	let local_files = null;
	const api = new Octokit();

	/**
	 * @type {FileSystemDirectoryHandle}
	 */
	let dirHandle;

	/**
	 * @param {FileSystemDirectoryHandle} dirHandle
	 * @param {string} path
	 */
	async function walkLocal(dirHandle, path) {
		// @ts-ignore
		for await (const [name, handle] of dirHandle) {
			/** @type {string} */
			const subpath = path ? `${path}/${name}` : name;
			if (handle.kind == 'directory') {
				await walkLocal(handle, subpath);
			} else {
				local_files[subpath] = handle;
				local_files = local_files;
			}
		}
	}

	async function onOpenLocal() {
		/** @type {FileSystemDirectoryHandle} */
		// @ts-ignore
		dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
		local_files = {};
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
		loading = true;
		await walkRepo(owner, repo, '');
		loading = false;
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
		return f;
	}

	/**
	 * @param e {Event}
	 */
	async function onSync(e) {
		// @ts-ignore
		const all = e.target.textContent.includes('all');
		loading = true;
		for (let file of remote_files ?? []) {
			if (all || !(file.subpath in local_files)) {
				delete local_files[file.subpath];
				let res = await fetch(file.download_url);
				let handle = await writeFile(file.subpath, await res.blob());
				local_files[file.subpath] = handle;
			}
		}
		await walkLocal(dirHandle, '');
		loading = false;
	}

	onMount(() => {
		onOpenRepo();
	});
</script>

<div class="container h-full mx-auto flex flex-col justify-center items-center p-4 space-y-2">
	<div class="flex flex-row space-x-2">
		{#if loading}
			<ProgressRadial width="w-12" />
		{:else}
			<!--<button type="button" class="btn variant-ghost" on:click={onOpenRepo}>Open repo</button>-->
			{#if local_files != null}
				<button type="button" class="btn variant-ghost" on:click={onSync}>Sync all</button>
				<button type="button" class="btn variant-ghost" on:click={onSync}>Sync new</button>
			{:else}
				<button type="button" class="btn variant-ghost" on:click={onOpenLocal}>Open local</button>
			{/if}
		{/if}
	</div>
	<div class="table-container">
		{#if Array.isArray(remote_files)}
			<table class="table table-hover">
				<thead>
					<tr><th>status</th><th>file</th><th>size</th></tr>
				</thead>
				<tbody>
					{#each remote_files as file}
						{#if local_files == null}
							<tr>
								<td class="text-center">?</td>
								<td>{file.subpath}</td>
								<td>{file.size}</td>
							</tr>
						{:else if file.subpath in local_files}
							<tr class="text-success-500">
								<td class="text-center">⟳</td>
								<td>{file.subpath}</td>
								<td>{file.size}</td>
							</tr>
						{:else}
							<tr class="text-warning-500">
								<td class="text-center">↓</td>
								<td>{file.subpath}</td>
								<td>{file.size}</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
