const express = require("express");
const fs = require("fs");
const nodemailer = require('nodemailer')
const app = express();
var bodyParser = require("body-parser");
const colaboradorData = require("./cadastro-colaborador/cadastro-colaborador.json");
const resetPasswordData = require("./reset-password-token/reset-password-token.json");
const usersData = require("./users/users.json");
const cors = require("cors");
const port = 3001;
const jwt = require("jsonwebtoken");

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
  const userData = jwt.decode(token);
  delete userData.iat;
  delete userData.exp;
  const newToken = jwt.sign(userData, "jwtSecret", {
    expiresIn: 500, //1 min
  });
  res.status(200).send({ token: newToken, user: userData });
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
  res.status(200).send(colaboradorData);
});

app.get("/registeremployee/:id", (req, res) => {
  const { id } = req.params;

  const colaborador = colaboradorData.find(
    (colaborador) => colaborador.id == id
  );
  if (colaborador) {
    console.log("Aceito");
    res.status(200).send(colaborador);
  } else {
    console.log("Rejected");
    res.status(401).send({
      message: `id ${id} não encontrado`,
    });
  }
});

// app.post("/registeremployee/:id", (req, res) => {
//   const { id } = req.params;
//   const { descricao, cpfCnpj, tipoPessoa, telefone, status } = req.body;
//   const cadastroColaborador = {
//     codigo: colaboradorData.length + 1,
//     descricao: descricao,
//     cpfCnpj: cpfCnpj,
//     tipoPessoa: tipoPessoa,
//     telefone: telefone,
//     grupoPrivilegio: 0,
//     status: status,
//   };
//   const nenhumNull = Object.keys(cadastroColaborador).every((propertyName) => {
//     if (cadastroColaborador[propertyName] == null) {
//       res.status(418).send({
//         message: `propriedade ${propertyName} não pode ser null`,
//         value: cadastroColaborador[propertyName],
//       });
//       return false;
//     }
//     return true;
//   });
//   if (!nenhumNull) {
//     return;
//   }
//   colaboradorData.push(cadastroColaborador);
//   fs.writeFile(colaboradorDataPath, JSON.stringify(colaboradorData), (err) => {
//     if (err) throw err;
//     console.log("done writing");
//   });
//   res.send({ ...cadastroColaborador });
// });
