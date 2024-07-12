import type { NextApiRequest } from "next";

export const config = {
	runtime: "edge",
}

export default function handler(req: NextApiRequest){
	const params = new URL(req.url ?? "").searchParams;

	const expression = params.get("expression");
	const parser = params.get("parser");
	const variables = params.get("variables");
	if(expression === null || parser === null || variables === null){
		return new Response("Insufficient number of parameters were supplied", {status: 400});
	}

	let vars;
	try{
		vars = JSON.parse(variables);
	}catch(_){
		return new Response("Improperly formatted value for 'variables' was supplied", {status: 400});
	}
	if(typeof vars !== "object"){
		return new Response("Improper structure for 'variables' was supplied", {status: 400});
	}
	for(const key in vars){
		if(!["boolean", "number"].includes(typeof vars[key])){
			return new Response("Improper value types for 'variables' was supplied", {status: 400});
		}
	}

	return fetch(`${process.env.ARITHMEXP_EVALUATOR}?${new URLSearchParams({
		expression: expression,
		parser: parser,
		variables: variables
	})}`, {method: "GET"});
}
