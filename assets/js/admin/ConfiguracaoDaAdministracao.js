/**
 * Define a credencial usada para abrir a área administrativa.
 *
 * A senha não é guardada como texto: o navegador compara uma derivação PBKDF2.
 * Esta proteção controla apenas a interface local. Como o projeto é publicado
 * em uma página estática, ela não substitui as permissões do GitHub.
 */
const CONFIGURACAO_DA_ADMINISTRACAO = Object.freeze({
  usuario: "administradora",
  iteracoes: 210000,
  algoritmo: "SHA-256",
  sal: "wWWZvjtB2ZPSZNd3JXThRg==",
  senhaDerivada: "d/lD5D1lAAUjlQ4xcH9zuWsj3nz68iWfixReWLj0Ryc=",
  duracaoDaSessaoEmMinutos: 30
});
