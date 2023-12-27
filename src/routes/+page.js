/** @type {import('./$types').PageLoad} */
export async function load({ url }) {
	return {
		owner: url.searchParams.get('owner') ?? 'nicolas-albert',
		repo: url.searchParams.get('repo') ?? 'gmail_forwarder'
	};
}
