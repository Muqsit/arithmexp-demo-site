import "semantic-ui-css/semantic.min.css";
import "styles/style.css";

import React from "react";
import Head from "next/head";

export default function MyApp({Component, pageProps}: {
	Component: React.ComponentType,
	pageProps: {}
}){
	return <>
		<Head>
			<meta charSet="utf-8" />
			<link rel="icon" href="/favicon.ico" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="theme-color" content="#000000" />
			<meta property="og:title" content="muqsit/arithmexp: A PHP Mathematical Expression Parser Library" />
			<title>arithmexp demo</title>
		</Head>
		<Component {...pageProps} />
	</>;
};