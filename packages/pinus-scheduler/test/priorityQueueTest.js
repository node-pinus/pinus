var PriorityQueue = require('../lib/priorityQueue');
//var Queue = require('./PriorityQueue');
//
//var queue = new Queue();

function testPriorityQueue(num, count){
  var queue = PriorityQueue.createPriorityQueue();
  
  for(var k = 0; k < num; k++){
    var testCase = [];
    var result = new Array(count);
    
    for(var i = 0; i < count; i++){
      testCase[i] = Math.random()*count;
    }
    
    var start = (new Date()).getTime();
      for(var i = 0; i < count; i++)
        queue.offer(testCase[i]);
    var end = (new Date()).getTime();
    console.log(end - start);
    
    start = (new Date()).getTime();
//    var value = queue.pop();
    for(var i = 0; i < count; i++){
      result[i] = queue.pop();
//      next = result[i];
//      if(value > next){
//        console.log('PriorityQueue error!');
//        console.log(queue);
//        console.log(result);
//        break;
//      }
//      value = next;
//      queue.pop();
    }
    end = (new Date()).getTime();
    
    console.log(end - start);  
    
//    console.log(result);
    
    var start = result[0];
    
    for(var i = 1; i < count; i++){
      var next = result[i];
    
      if(start > next){
        console.log("Error!!!!!!");
        console.log("start : " + start + " next : " + next + " i : " + i);
//        console.log(result);
        break;
      }
    
      start = next;
    }
    
    console.log('After the ' + k + ' iteration with test count : ' + count);
  }
}

testPriorityQueue(10, 100000);
//var test = [];
//start = Date.now();
//var k;
//for(var i = 0; i < 100000000; i++){
//  k = i + 34354/i ;
//}
//end = Date.now();
//
//console.log(end - start);
