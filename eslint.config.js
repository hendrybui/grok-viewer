import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'no-inner-declarations': 'off',
      'no-console': 'off'
    }
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        CanvasRenderingContext2D: 'readonly'
      }
    }
  },
  {
    files: ['main.js', 'src/main/**/*.js'],
    languageOptions: {
      globals: {
        window: 'off',
        document: 'off',
        navigator: 'off',
        localStorage: 'off',
        sessionStorage: 'off',
        fetch: 'off'
      }
    }
  }
];
