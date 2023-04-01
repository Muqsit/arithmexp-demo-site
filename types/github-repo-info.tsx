export default interface GitHubRepoInfo{
	html_url: string,
	full_name: string,
	description: string,
	stargazers_count: number,
	forks_count: number,
	open_issues_count: number,
	license: {spdx_id: string},
	owner: {avatar_url: string}
};