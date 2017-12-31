var obj = function(){
	this.app = 1;
}

obj.prototype.add = function(){

}

var a = new obj();

console.log(a);

for(var key in a){
	console.log(key);
}