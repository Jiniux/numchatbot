# Numchatbot
Telegram bot that counts messages sent in a group since the moment it has been added. The bot is written in Javascript (NodeJS) with [Telegraf](https://github.com/telegraf/telegraf) and uses SQLite3 for storing data. 

In order to work, you need to configure it first with the shell script in the root directory:
```
$ ./configure.sh <bot_token> <database_path>
```

Afterwards, run it:
```
$ ./run.sh
```

And that's all folks.
