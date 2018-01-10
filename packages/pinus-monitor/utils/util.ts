/**
 * convert Date as  yyyy-mm-dd hh:mm:ss
 */
export function formatTime(date: Date) {
    let n = date.getFullYear();
    let y = date.getMonth() + 1;
    let r = date.getDate();
    let mytime = date.toLocaleTimeString();
    let mytimes = n + '-' + y + '-' + r + ' ' + mytime;
    return mytimes;
}
