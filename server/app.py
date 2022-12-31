import logging
import os
import importlib
import argparse
import flask
import messenger

app = flask.Flask(__name__)


@app.route("/functions/<string:func_name>", methods=["POST"])
def execute_functions(func_name=""):
    directory = os.path.join(os.getcwd(), "functions")
    files = os.listdir(directory)

    if func_name not in files:
        return flask.jsonify({"message": "function not found"}), 404

    func = os.path.join(directory, func_name)
    if not os.path.isfile(func):
        return flask.jsonify({"message": "function not found"}), 404

    module = importlib.import_module(f"functions.{func_name[:-3]}")

    try:
        if not "main" in module.__dict__:
            return flask.jsonify({"message": "Function must have \"main\" function"}), 400

        result = module.main(flask.request.get_json(force=True))
        return flask.jsonify({"result": result}), 200
    except Exception as e:
        return flask.jsonify({"message": str(e)}), 500


@app.route("/")
def svelte_root():
    return flask.send_from_directory(os.path.join("ui", "build"), "index.html")


@app.route("/<path:path>")
def svelte_static(path=""):
    return flask.send_from_directory(os.path.join("ui", "build"), path)


if __name__ == "__main__":
    args = argparse.ArgumentParser()
    args.add_argument(
        "--debug", action=argparse.BooleanOptionalAction, default=True)
    debug = args.parse_args().debug
    logging.basicConfig(format='[%(asctime)s] %(levelname)s: %(message)s', level=os.getenv(
        "LOG_LEVEL", logging.INFO))

    PORT = os.getenv("WEB_SERVER_PORT")
    if not PORT:
        raise ValueError(
            "No port specified: Environment variable WEB_SERVER_PORT is empty")
    logging.info(f"Starting server on port {PORT}")

    try:
        messenger.to_stdout(messenger.SerializedMessage(
            type=messenger.TYPE_READY,
            json={
                "port": PORT
            }
        ))
        app.run(host=None, port=int(PORT), debug=debug)
    except Exception as e:
        messenger.to_stdout(messenger.SerializedMessage(
            type=messenger.TYPE_ERROR,
            json={
                "message": str(e)
            }
        ))
