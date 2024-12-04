import 'dotenv/config';
import http from 'http';
import { MongoClient } from 'mongodb';
import { getRequestBody } from './utilities.js';
import fs from 'fs/promises';
import { handlePostsRoute } from './routes/posts-route.js';

let dbConn = await MongoClient.connect(process.env.MONGODB_CONNECTION_STRING);
export let dbo = dbConn.db(process.env.MONGODB_DATABASE_NAME);

// funktion som hanterar en request och response
async function handleRequest(request, response) {
	let url = new URL(request.url, 'http://' + request.headers.host);
	let path = url.pathname;
	let pathSegments = path.split('/').filter(function (segment) {
		if (segment === '' || segment === '..') {
			return false;
		} else {
			return true;
		}
	});




	let nextSegment = pathSegments.shift();

	// kollar nästa segment samt http metoden
	if (nextSegment === 'write-post') {
		if (request.method !== 'GET') {
			response.writeHead(405, { 'Content-Type': 'text/plain' });
			response.write('405 Method Not Allowed');
			response.end();
			return;
		}

		//läser in create post filen och skickar med ett formulär
		let template = (await fs.readFile('templates/create-post.volvo')).toString();

		response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
		response.write(template);
		response.end();
		return;
	}

	// kollar nästa segment samt http metoden
	if (nextSegment === 'posts') {
		await handlePostsRoute(pathSegments, url, request, response);
		return;
	}
}

let server = http.createServer(handleRequest);

server.listen(process.env.PORT);

