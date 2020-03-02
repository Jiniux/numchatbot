const sqlite = require('sqlite3')
const database = new sqlite.Database('numchat.db');

const getGroupMemberQuery =
    `select * from group_members 
    where tg_id = ? 
    and tg_group_id = ?;`;


function getGroupMember(userId, groupId) {
    return new Promise((rs, rj) => {
        database.get(
            getGroupMemberQuery,
            [
                userId, groupId
            ],
            (err, row) => err ? rj(err) : rs(row)
        )
    })
}

const addGroupMemberQuery =
    `INSERT INTO group_members 
    ("tg_id", "tg_group_id", "tg_username", 
    "message_count_today", "message_count_total", "day_end") 
    VALUES (?, ?, ?, ?, ?, ?);`;

function addGroupMember(userId, groupId, username, time) {
    username = username.replace(/\s+$/, '');

    return new Promise((rs, rj) => {
        const now = new Date(time)
        const dayStart = new Date(
            now.getFullYear(), now.getMonth(), now.getDate() + 1,
            0, 0, 0,
        );

        database.run(
            addGroupMemberQuery,
            [
                userId, groupId, username,
                1, 1, +dayStart
            ],
            (err) => err ? rj(err) : rs()
        )
    })
}

const getTopTenDayGroupQuery =
    `select * from group_members 
    where tg_group_id = ? 
    and ? < day_end 
    order by message_count_today desc
    limit 10;`;

function getTopTenDayGroup(groupId) {
    return new Promise((rs, rj) => {
        database.all(
            getTopTenDayGroupQuery,
            [
                groupId, +new Date()
            ],
            (err, rows) => err ? rj(err) : rs(rows)
        )
    })
}

const getTopTenGroupQuery =
    `select * from group_members 
    where tg_group_id = ? 
    order by message_count_total desc
    limit 10;`;

function getTopTenGroup(groupId) {
    return new Promise((rs, rj) => {
        database.all(
            getTopTenGroupQuery,
            [
                groupId
            ],
            (err, rows) => err ? rj(err) : rs(rows)
        )
    })
}

const updateGroupMembersUsernameQuery =
    `update group_members
    set tg_username = ? where tg_id = ?`

function updateGroupMembersUsername(userId, username) {
    return new Promise((rs, rj) => {
        database.run(
            updateGroupMembersUsernameQuery,
            [
                username, userId
            ],
            (err) => err ? rj(err) : rs()
        )
    })
}

const updateGroupMemberQuery =
    `update group_members
    set message_count_today = ?, message_count_total = ?, day_end = ?
    where tg_id = ? and tg_group_id = ?;`

function updateGroupMember(userId, groupId, username, time) {
    const now = new Date(time)
    const dayStart = new Date(
        now.getFullYear(), now.getMonth(), now.getDate() + 1,
        0, 0, 0,
    );

    return new Promise(async (rs, rj) => {
        getGroupMember(userId, groupId)
            .then(member => {
                if (!member) {
                    addGroupMember(userId, groupId, username)
                        .then(rs).catch(rj)
                }
                else {
                    if (time > (member['day_end'])) {
                        member['message_count_today'] = 1
                        member['day_end'] = +dayStart;
                    }
                    else
                        member['message_count_today']++

                    member['message_count_total']++
                    database.run(
                        updateGroupMemberQuery,
                        [
                            member['message_count_today'], member['message_count_total'], member['day_end'],
                            userId, groupId
                        ],
                        (err) => err ? rj(err) : rs()
                    )
                }
            })
            .catch(rj)
    })
}
module.exports = {
    updateGroupMember, getGroupMember, updateGroupMembersUsername,
    getTopTenDayGroup, getTopTenGroup
}