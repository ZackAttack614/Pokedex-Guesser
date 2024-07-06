import hashlib
from flask import Flask, request, jsonify
import flask_cors
from google.cloud import firestore
from googletrans import Translator
from google.oauth2 import service_account
import concurrent.futures
import asyncio

credentials = service_account.Credentials.from_service_account_file('serviceAccountKey.json')
db = firestore.Client(credentials=credentials, project=credentials.project_id)

app = Flask(__name__)
flask_cors.CORS(app)

executor = concurrent.futures.ThreadPoolExecutor()

async def run_blocking_io(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args)

def translate_text(text, target_language):
    translator = Translator()
    translated_text = translator.translate(text, dest=target_language).text
    return translated_text

def get_document(doc_ref):
    return doc_ref.get()

def set_document(doc_ref, data):
    doc_ref.set(data)

@app.route('/translate', methods=['POST'])
async def translate():
    data = request.get_json()
    text = data.get('text')
    target_language = data.get('target_language')

    if not text or not target_language:
        return jsonify({'error': 'Missing required fields: text and target_language'}), 400

    doc_id = hashlib.sha256(f"{text}_{target_language}".encode()).hexdigest()
    doc_ref = db.collection('translations').document(doc_id)
    doc = await run_blocking_io(get_document, doc_ref)

    if doc.exists:
        return jsonify({'translation': doc.to_dict()['translation']})

    translated_text = await run_blocking_io(translate_text, text, target_language)
    await run_blocking_io(set_document, doc_ref, {'text': text, 'language': target_language, 'translation': translated_text})

    return jsonify({'translation': translated_text})

if __name__ == '__main__':
    app.run(debug=True)
