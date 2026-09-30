import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1440px', height: '900px' } },
      },
    },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          'Design System',
          'Intro',
          'Primitives',
          'Custom',
          'ReUI',
          'Demo',
          'Dashboard',
          'Subscriptions',
          'Onboarding',
          'Layout',
          'Settings',
          'Reports',
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      document.documentElement.classList.toggle('dark', theme === 'dark');
      return (
        <div className={`font-sans antialiased bg-background text-foreground p-6 min-h-[100px] ${theme === 'dark' ? 'dark' : ''}`}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
