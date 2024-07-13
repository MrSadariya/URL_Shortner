const jwt=require("jsonwebtoken");
const secret="Parth@1234"

function setUser(user){
    return jwt.sign({Email:user.Email},secret);
}

function getUser(id){
    return IDtoUser.get(id);
}

module.exports={
    setUser,getUser
}