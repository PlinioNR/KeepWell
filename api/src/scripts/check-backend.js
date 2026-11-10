import { spawnSync } from 'node:child_process';

const suites = [
  'test', 'test:integration', 'test:auth', 'test:categories',
  'test:objects', 'test:photos', 'test:tasks'
];
const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Executa npm.cmd run test:backend.');
  process.exit(1);
}

const results = suites.map(suite => {
  const result = spawnSync(process.execPath, [npm, 'run', suite], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  return { suite, passed: result.status === 0 };
});

console.log('\nResultado dos testes do backend');
for (const { suite, passed } of results) {
  console.log((passed ? 'OK ' : 'FALHOU ') + suite);
}
if (results.some(result => !result.passed)) process.exitCode = 1;
