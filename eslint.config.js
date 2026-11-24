// ESLint (configuración plana). Ejecutar con: npm run lint
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Complejidad ciclomática máxima por función: obliga a dividir la lógica en piezas pequeñas.
      complexity: ['error', { max: 7 }],
      // Reglas clásicas de los hooks de React (el código ya las referencia en comentarios eslint-disable).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
