const express = require("express");
const fs = require("fs");
const nodemailer = require('nodemailer')
const app = express();
var bodyParser = require("body-parser");
const colaboradorData = require("./cadastro-colaborador/cadastro-colaborador.json");
const rolePermissionData = require("./register-role-permission/register-role-permission.json");
const resetPasswordData = require("./reset-password-token/reset-password-token.json");
const usersData = require("./users/users.json");
const pages = require("./pages/pages.json");
const cors = require("cors");
const port = 3001;
const jwt = require("jsonwebtoken");
const { promisify } = require('util');
const { setTimeout } = require("timers");

const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: 'anotherlandgs@gmail.com',
    pass: 'Turnback30@'
  }
})

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.listen(port, () => {
  console.log("running on http://localhost:" + port);
});

app.post("/user/login", (req, res) => {
  const { userName, password } = req.body;
  console.log("username " + userName);
  console.log("password " + password);
  if (userName == null && password == null) {
    res.status(401).send({
      message: `Data cant be null`,
    });
  }
  const usuarioEncontrado = usersData.find(
    (x) => (x.userName == userName || x.email ==userName ) && x.password == password
  );
  if (!usuarioEncontrado) {
    res.status(401).send({
      message: `User or password incorrect. Please, try again`,
    });
    return;
  }
  const userSemSenha = { ...usuarioEncontrado };
  delete userSemSenha.password;
  const token = jwt.sign(userSemSenha, "jwtSecret", {
    expiresIn: 500, //1 min
  });
  res.status(200).send({ token: token, user: userSemSenha });
});

app.post("/user/loginWithToken", (req, res) => {
  const { token } = req.headers;
  if (!token) {
    res.status(401).send({
      message: "Token not found",
    });
  }
  jwt.verify(token, "jwtSecret", (err, decoded) => {
    if (err) {
      res.status(401).send({
        message: "Failed to authenticate",
        isAuthenticated: false,
      });
    }
  });
  const userDecoded = jwt.decode(token);
  const user = {...usersData.find(x => x.id == userDecoded.id)}
  if(!user) {
    {
      res.status(401).send({
        message: "User not found",
        isAuthenticated: false,
      });
      return
    }
  }
  delete user.password;
  const newToken = jwt.sign(user, "jwtSecret", {
    expiresIn: 500, //1 min
  });
  res.status(200).send({ token: newToken, user: user });
});

app.post("/user/forgotPassword", (req, res) => {
  const { email } = req.body;
  console.log("aPI CALLED")
  if (!email) {
    res.status(401).send({
      message: "User invalid",
    });
  }
  const usuarioEncontrado = usersData.find(
    (x) => x.userName == email || x.email == email
  );
  if (!usuarioEncontrado) {
    res.status(401).send({
      message: "User or email not found",
    });
  }
  const tokenExpirationHour = 3
  const token = jwt.sign({userName: usuarioEncontrado.userName}, "jwt_Secret", {
    expiresIn: 60 * tokenExpirationHour * 60, //1 min
  });

  const idToken=  Math.floor(Math.random() * 515615615615615615)
  const resetPasswordTokens = resetPasswordData.filter(data => data.idUser != usuarioEncontrado.id)
  resetPasswordTokens.push({ 
    token: token,
    idToken: idToken,
    idUser: usuarioEncontrado.id})
  fs.writeFile("./reset-password-token/reset-password-token.json", JSON.stringify(resetPasswordTokens), (err) => {
    if (err) throw err;
    console.log("done writing");
  });
  console.log(usuarioEncontrado.email)
  const options = {
    from: 'anotherlandgs@gmail.com',
    to: usuarioEncontrado.email,
    subject: "Reset your password",
    html: `<h3> Hello, ${usuarioEncontrado.userName}</h3>
    <p>Click in this <a href="http://localhost:8080/resetpassword/${idToken}"><strong>Link</strong></a> to reset your password.</p>
    <span>The link will expire in ${tokenExpirationHour} hours. </span>
    `
  }
   
  transporter.sendMail(options, function(err, info) {
    if(err) {
      res.status(401).send({message: 'Email restriction, cannot send an reset'});
      console.log(err)
      return
    }
    console.log("Email sended")
    res.status(200).send({message: 'Email sended'});
  })
});

app.post("/user/verifyResetPasswordToken", (req, res) => {
  const { tokenId } = req.body;
  console.log(tokenId)
  console.log("aPI CALLED")
  if (!tokenId) {
    console.log("Id not found")
    res.status(401).send();
  }
  const tokenEncontrado = resetPasswordData.find(
    (x) => x.idToken == tokenId
  );
  if (!tokenEncontrado) {
    console.log("Token not found")
    res.status(401).send();
  }
  res.status(200).send();
})

app.post("/user/resetPassword", (req, res) => {
  const { tokenId, password } = req.body;
  console.log(tokenId)
  console.log("aPI CALLED")
  if (!tokenId) {
    console.log("Id not found")
    res.status(401).send();
  }
  const tokenEncontrado = resetPasswordData.find(
    (x) => x.idToken == tokenId
  );
  if (!tokenEncontrado) {
    console.log("Token not found")
    res.status(401).send();
  }
  console.log(tokenEncontrado.token)
  jwt.verify(tokenEncontrado.token, "jwt_Secret", (err, decoded) => {
    if (err) {
      res.status(401).send({
        message: "Time expired",
      });
    } else {
      const usuarioEncontrado = usersData.find(data => data.id == tokenEncontrado.idUser)
      const users = usersData.filter(data => data.id != tokenEncontrado.idUser)
      usuarioEncontrado.password = password
      users.push(usuarioEncontrado)
      fs.writeFile("./users/users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
      const resetPasswordTokens = resetPasswordData.filter(data => data.idToken != tokenEncontrado.idToken)
      fs.writeFile("./reset-password-token/reset-password-token.json", JSON.stringify(resetPasswordTokens), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
      res.status(200).send({message: "Password changed successfully"}); 
    }
  });
})

app.get("/registeremployee/", (req, res) => {
  const colaboradores = colaboradorData.filter(colaborador => colaborador.id != 1)
  console.log(colaboradores)
  res.status(200).send(colaboradorData);
});

app.get("/registeremployee/:id", (req, res) => {
  const { id } = req.params;
  const colaborador = colaboradorData.find(
    (colaborador) => colaborador.id == id
  );
  if(id == 1) {
    res.status(401).send({
      message: `Employee not found`,
    });
    return
  }
  if (colaborador) {
    delete colaborador.password;
    res.status(200).send(colaborador);
  } else {
    res.status(401).send({
      message: `Employee not found`,
    });
  }
});

app.post("/registeremployee", (req, res) => {
  const { id,description,email,cpfCnpj,password,employeeType,phones,roleId,inactive } = req.body;
  const colaborador = colaboradorData.find(
    (colaborador) => colaborador.description.toLowerCase() == description.toLowerCase()
  );
  if (colaborador) {
    res.status(401).send({message: 'Description already in use, change the name and try again'});
    return
  }
  const roleFound = rolePermissionData.find(x => x.id == roleId)
  if(!roleFound) {
    res.status(401).send({message: 'Role not found'});
    return
  }
  console.log("role")
  console.log(roleFound)
  const users = usersData
  const employeeNewId= usersData.length + 1
      const user = {
        id: employeeNewId,
        userName: description,
        email: email,
        password: password,
        role: roleFound,
        inactive: inactive
      }
      users.push(user)
      console.log(user)
      fs.writeFile("./users/users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
  const employees = colaboradorData
  employees.push({...req.body,id: employeeNewId })
  fs.writeFile("./cadastro-colaborador/cadastro-colaborador.json", JSON.stringify(employees), (err) => {
    if (err) throw err;
    console.log("done writing");
  })
  res.status(200).send();
});

app.put("/registeremployee", (req, res) => {
  const { id,description,email,cpfCnpj,password,employeeType,phones,roleId,inactive } = req.body;
  const colaborador = colaboradorData.find(
    (colaborador) => colaborador.id == id
  );
  if (!colaborador) {
    res.status(401).send({message: 'Employee not found'});
    return
  }
  const hasColaboradorWithName = colaboradorData.find(
    (colaborador) => colaborador.description.toLowerCase() == description.toLowerCase()
  );
  const nameIsTheSameId = hasColaboradorWithName? hasColaboradorWithName.id == colaborador.id : true
  if (!nameIsTheSameId) {
    res.status(401).send({message: 'Description already in use, change the name and try again'});
    return
  }
  const roleFound = rolePermissionData.find(x => x.id == roleId)
  if(!roleFound) {
    res.status(401).send({message: 'Role not found'});
    return
  }
  const users = usersData.filter(u => u.id != id)
  const userFound = usersData.find(u => u.id == id)
  const userPassword = password || userFound?.password
  const user = {
    id: id,
    userName: description,
    email: email,
    password: userPassword,
    role: roleFound,
    inactive: inactive
  }

      users.push(user)
      fs.writeFile("./users/users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
  const employees = colaboradorData.filter(c => c.id != id)
  const employeeUpdated = {...req.body,password: userPassword}
  employees.push(employeeUpdated)

  fs.writeFile("./cadastro-colaborador/cadastro-colaborador.json", JSON.stringify(employees), (err) => {
    if (err) throw err;
    console.log("done writing");
    
  })
  console.log("updatedddddddddddddddddddddddddddddddddddddddddddddddddddddddd")
  console.log(employeeUpdated)

  res.status(200).send();

  
  
});

app.delete("/registeremployee/:id", (req, res) => {
  const { id} = req.params;
  const colaborador = colaboradorData.find(
    (colaborador) => colaborador.id == id
  );
  
  if (!colaborador) {
    res.status(401).send({message: 'Employee not found'});
    return
  }
  if(id == 1) {
    res.status(401).send({message: 'This employee cannot be deleted'});
    return

  }
  const users = usersData.filter(u => u.id != id)
      fs.writeFile("./users/users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
  const employees = colaboradorData.filter(u => u.id != id)
  fs.writeFile("./cadastro-colaborador/cadastro-colaborador.json", JSON.stringify(employees), (err) => {
    if (err) throw err;
    console.log("done writing");
  })
  res.status(200).send();
});

app.get("/rolePermission/", (req, res) => {
  const rolePermission = rolePermissionData.map(role => ({id:role.id,description: role.description}))
  res.status(200).send(rolePermission);
});

app.get("/rolePermission/:id", (req, res) => {
  const { id } = req.params;
  const rolePermission = rolePermissionData.find(
    (role) => role.id == id
  );
  if (rolePermission) {
    res.status(200).send(rolePermission);
  } else {
    res.status(401).send({
      message: `Permission ${id} not found`,
    });
  }
});

app.post("/rolePermission", (req, res) => {
  const { id,description} = req.body;

  const sameDescription = rolePermissionData.find(
    (role) => role.description.toLowerCase() == description.toLowerCase()
  );
 
  if (sameDescription) {
    res.status(401).send({message: 'Description already in use'});
    return
  }
  const roleNewId = rolePermissionData.length + 1;
  const rolePagesPermission = pages.map(p => ({...p,roles:[]}))
  const roleData = rolePermissionData.filter(r => r.id != roleNewId)
  const newRole = {
    id: roleNewId,
    description: description,
    pagesPermission: rolePagesPermission
  }
  roleData.push(newRole)
      fs.writeFile("./register-role-permission/register-role-permission.json", JSON.stringify(roleData), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
  res.status(200).send(newRole);
});

app.put("/rolePermission", (req, res) => {
  const { id,description,pagesPermission} = req.body;
  const roleFound = rolePermissionData.find(
    (role) => role.id == id
  );
  if (!roleFound) {
    res.status(401).send({message: 'Role permission not found'});
    return
  }
  if (roleFound.id == 1) {
    res.status(401).send({message: 'Cannot change admin permission'});
    return
  }
  const descriptionExist = rolePermissionData.find(
    (role) => role.description.toLowerCase() == description.toLowerCase() && role.id != id
  );
  if (descriptionExist) {
    res.status(401).send({message: 'Description already in use'});
    return
  }
  const roleData = rolePermissionData.filter(r => r.id != id)
  const pagesWithRolePermission = pages.map(p => {
    const role = pagesPermission.find(rp => rp.id == p.id)
    return {
      id: p.id,
    path: p.path,
    roles: role?.roles || []
    }
  })
 
  roleFound.description = description
  roleFound.pagesPermission = pagesWithRolePermission
  console.log(JSON.stringify(roleFound))
  roleData.push(roleFound)
  fs.writeFile("./register-role-permission/register-role-permission.json", JSON.stringify(roleData), (err) => {
        if (err) throw err;
        console.log("done writing");
        return
      });
  const usersWithChangedRole = usersData.map( u => {
    if(u.role.id == roleFound.id) {
      return {...u,role: roleFound}
    }
    return {...u}
  })
  fs.writeFile("./users/users.json", JSON.stringify(usersWithChangedRole), (err) => {
    if (err) throw err;
    console.log("done writing");
  });
  res.status(200).send(roleData);
});

app.delete("/rolePermission/:id", (req, res) => {
  const { id} = req.params;
  const rolePermission = rolePermissionData.find(
    (role) => role.id == id
  );

  if (!rolePermission) {
    res.status(401).send({message: 'Permission id not found'});
    return
  }
  const permissionVinculado = usersData.find(u => u.role.id == id)
  if (permissionVinculado) {
    res.status(401).send({message: 'Role attached to a user'});
    return
  }
  const roleData = rolePermissionData.filter(r => r.id != id)
      fs.writeFile("./register-role-permission/register-role-permission.json", JSON.stringify(roleData), (err) => {
        if (err) throw err;
        console.log("done writing");
      });
  res.status(200).send();
});
