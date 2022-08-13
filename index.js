const express = require("express");
const fs = require("fs");
const app = express();
var bodyParser = require("body-parser");
const colaboradorData = require("./cadastro-colaborador/cadastro-colaborador.json");
const usersData = require("./users/users.json");
const cors = require("cors");
const port = 3001;
const jwt = require("jsonwebtoken");

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
    (x) => x.userName == userName && x.password == password
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
