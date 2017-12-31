
function joinTest(num){

	var arr = [];
	for(var i = 0; i < num; i++)
		arr.push(i + '');

	var start = Date.now();
	var str = '';

	for(var i = 0; i < num; i++){
		str += arr[i];
	}

	var end = Date.now();
	var time1 = end - start;

	start = Date.now();
	var arr = [];
	for(var i = 0; i < num; i++){
		arr.push(arr[i]);
	}
	var str1 = arr.join();
	end = Date.now();
	var time2 = end - start;

	console.log('test count : %j, \ncost 1 : %j, \ncost 2 : %j', num, time1, time2);
}

joinTest(100);
joinTest(50000);
joinTest(100000);
joinTest(200000);
//joinTest(500000);