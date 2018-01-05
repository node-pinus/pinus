function a(){
	try{
		// throw new Error(2);
	}catch(e){
		return 0;
	}
	return 1;
}

for(var i=0;i<10;i++){
	console.log(a());
}