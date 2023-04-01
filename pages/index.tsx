import App from "../components/app";
import type { NextPageContext } from "next"

export const config = {
	runtime: "experimental-edge",
};

export async function getServerSideProps(ctx: NextPageContext){
	if(ctx.res !== null && ctx.res?.setHeader != null) ctx.res.setHeader(
		"Cache-Control",
		"public, maxage=3600"
	)
	const response = await fetch(new Request("https://api.github.com/repos/muqsit/arithmexp", {
		method: "GET",
		headers: {"User-Agent": "arithmexp-demo-site"}
	}));
	if(response.status !== 200){
		throw new Error("Failed to retrieve GitHub repository info (" + response.status + "): " + await response.text());
	}
	const data = await response.json();
	return {props: {arithmexp_info: data}};
};

export default App;
