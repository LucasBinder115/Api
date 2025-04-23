from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/questions', methods=['POST'])
def api_generate_questions():
    data = request.get_json()
    topic = data.get('topic', '')
    questions = generate_questions(topic)
    return jsonify({'questions': questions})

if __name__ == '__main__':
    app.run(debug=True)