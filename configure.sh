configure_node() {
    if ! [ -x "$(command -v node)" ] || ! [ -x "$(command -v npm)" ] 
        then
            echo 'Error: NodeJS is not properly installed.' >&2
            exit 1
        else
            cd src
            echo "{\"token\" : \"$1\", \"database_path\": \"$2\"}" > config.json
            npm install
            cd ..
    fi
}

configure_database() {
    cd src
    node -e "
        function createTable() {
            database.run(\`
            CREATE TABLE \"group_members\" (
                \"id\"	                INTEGER NOT NULL UNIQUE,
                \"tg_id\"	            INTEGER,
	            \"tg_group_id\"	        INTEGER,
	            \"tg_username\"	        TEXT,
	            \"message_count_today\"	INTEGER,
	            \"message_count_total\"	INTEGER,
	            \"day_end\"	INTEGER,
	            PRIMARY KEY(\"id\")
            );\`)
        }

        process.chdir('../');

        const sqlite = require('sqlite3');
        const database = new sqlite.Database(\"$2\", createTable) 
    " 
    cd ..
}

if [ -z $1 ] || [ -z $2 ]
then
    echo "Error: no argument supplied."
    echo "Usage: ./configures.sh <bot_token> <database_path>"
else
    configure_node $1 $2
    configure_database $1 $2
fi