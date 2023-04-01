import { NextRequest } from "next/server"
import { env } from "process";

export const config = {
	runtime: "edge",
}

export default async function handler(req: NextRequest){
	const params = new URLSearchParams(req.nextUrl.searchParams);
	return fetch(`${process.env.ARITHMEXP_EVALUATOR}?${params}`, {method: "GET"});
}
