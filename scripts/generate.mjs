import { writeFile } from 'node:fs/promises';
import openapiTS, { COMMENT_HEADER, astToString } from 'openapi-typescript';

const DOCUMENT_URL = 'https://post.adaptlypost.com/post/api/v1/openapi.json';
const OUTPUT = new URL('../src/generated/openapi.ts', import.meta.url);
const COMBINATORS = ['anyOf', 'oneOf'];

const onlyRequiresKeys = (branches) =>
  branches.every((branch) => Object.keys(branch).every((key) => key === 'required'));

// openapi-typescript turns a branch that only lists required keys into `unknown`, which swallows the whole schema
const dropRequiredOnlyBranches = (node) => {
  if (Array.isArray(node)) return node.forEach(dropRequiredOnlyBranches);
  if (node === null || typeof node !== 'object') return;
  for (const combinator of COMBINATORS) {
    if (Array.isArray(node[combinator]) && onlyRequiresKeys(node[combinator])) delete node[combinator];
  }
  Object.values(node).forEach(dropRequiredOnlyBranches);
};

const response = await fetch(DOCUMENT_URL);
if (!response.ok) throw new Error(`${DOCUMENT_URL} answered ${response.status}`);
const document = await response.json();
dropRequiredOnlyBranches(document);

const ast = await openapiTS(document, { defaultNonNullable: false });
await writeFile(OUTPUT, COMMENT_HEADER + astToString(ast));
