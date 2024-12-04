import http from 'http';
import { getRequestBody , cleanupHTMLOutput} from '../utilities.js';
import { dbo } from '../index.js';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';


/**
 * 
 * @param {string[]} pathSegments 
 * @param {http.IncomingMessage} request 
 * @param {http.ServerResponse} response 
 */
export async function handlePostsRoute(pathSegments, url, request, response) {
    let nextSegment = pathSegments.shift();
    if (!nextSegment) {

        //tar emot datan från formuläret och skickar med det till databasen
        if (request.method === 'POST') {
            let body = await getRequestBody(request);

            let params = new URLSearchParams(body);
    
            if (!params.get('userName') || !params.get('title')
                || !params.get('bodyText') ){
    
                response.writeHead(400, { 'Content-Type': 'text/plain' });
                response.write('400 Bad Request');
                response.end();
                return;
            }
    
            let result = await dbo.collection('Diskussion').insertOne({
                'användarnamn': params.get('userName'),
                'rubrik': params.get('title'),
                'brödtext': params.get('bodyText')
            });
    
    
            response.writeHead(303, { 'location': '/posts/' + result.insertedId });
            response.end();
            return;
        }

        // hämtar de inlägg som finns i databasen och visar alla rubriker av inläggen i form av länkar.
        // Gör så att man även kan filtrera inlägg baserat på användar id.
        if (request.method === 'GET'){
            let filter = {};

            if (url.searchParams.has('user')){
                filter._id = new ObjectId(url.searchParams.get('user'));
            }

            let documents = await dbo.collection('Diskussion').find(filter).toArray();

            let postsString = '';

            for(let i = 0; i < documents.length; i++){
                postsString += '<li><a href="/posts/' 
                + cleanupHTMLOutput(documents[i]._id.toString())
                + '">'
                + cleanupHTMLOutput(documents[i].rubrik)
                + '</a></li>';
            }

            let template = (await fs.readFile('templates/post-list.volvo')).toString();

            template = template.replaceAll('%{postsList}%', postsString);

            response.writeHead(202, {'Content-Type': 'text/html;charset=UTF-8'});
            response.write(template);
            response.end();
            return;
        }

        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
       
    }

    if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
    }

    // Hämtar det inlägget man skickade in, från databasen. 
    // Skickar tillbaka inlägget i form av en sida. 
    let discussionDocument;
    try {
        discussionDocument = await dbo.collection('Diskussion').findOne({
            "_id": new ObjectId(nextSegment)
        });
    } catch (e) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.write('404 Not Found');
        response.end();
        return;
    }

    if (!discussionDocument) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.write('404 Not Found');
        response.end();
        return;
    }

    let template = (await fs.readFile('templates/posts.volvo')).toString();
    template = template.replaceAll('%{userName}%', cleanupHTMLOutput(discussionDocument.användarnamn));
    template = template.replaceAll('%{title}%', cleanupHTMLOutput(discussionDocument.rubrik));
    template = template.replaceAll('%{bodyText}%',  cleanupHTMLOutput(discussionDocument.brödtext));

    response.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
    response.write(template);
    response.end();
    return;
}   