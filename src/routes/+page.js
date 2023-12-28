import { browser } from '$app/environment';

export const prerender = true;

/** @type {import('./$types').PageLoad} */
export async function load({ url }) {
	if (browser) {
		return {
			owner: url.searchParams?.get('owner') ?? 'nicolas-albert',
			repo: url.searchParams?.get('repo') ?? 'gmail_forwarder'
		};
	}
	return {
		owner: '',
		repo: ''
	};
}
