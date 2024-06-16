from flask import Flask, render_template, jsonify
import time

app = Flask(__name__)

# Dati degli utenti simulati
user_data = {
    'taps': 0,
    'farm': 0,
    'last_tap': time.time()
}

@app.route('/')
def index():
    return render_template('index.html', taps=user_data['taps'])

@app.route('/tasks')
def tasks():
    return render_template('tasks.html')

@app.route('/farm')
def farm():
    return render_template('farm.html', farm=user_data['farm'])

@app.route('/invite')
def invite():
    return render_template('invite.html')

@app.route('/tap', methods=['POST'])
def tap():
    current_time = time.time()
    if current_time - user_data['last_tap'] >= 4 * 3600:
        user_data['taps'] += 100
        user_data['last_tap'] = current_time
    return jsonify(taps=user_data['taps'])

if __name__ == '__main__':
    app.run(debug=True)

