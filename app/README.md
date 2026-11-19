# KeepWell — app Flutter

App Android do KeepWell. A documentação completa (funcionalidades, como correr, estrutura e regras do código) está no [README principal](../README.md).

Arranque rápido, dentro desta pasta:

```bash
flutter pub get
flutter run
```

Para testar no Chrome, inicia a API na pasta `api` com `npm run dev`.
Na pasta `app`, executa:

```powershell
flutter run -d chrome --web-hostname localhost --web-port 8080
```

A app Web usa `http://localhost:3000` e a API permite pedidos da origem
`http://localhost:8080`. No Chrome, seleciona a fotografia de um ficheiro.

## Integração com casas

O backend usa houseId e houseRole (owner, manager, member). A app deve consultar
/auth/me depois de entrar, sair ou mudar de casa, e atualizar os dados apresentados.
Os ecrãs de gestão de categorias deram lugar à casa e às dicas. Apenas owner e
manager gerem cuidados e dicas. O membro pode criar objetos e enviar a primeira
foto dos objetos que criou. O contrato está no [README da API](../api/README.md).

A integração dos ecrãs com estas permissões ainda está pendente.
