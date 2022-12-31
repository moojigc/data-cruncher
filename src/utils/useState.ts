import { ExtensionContext } from 'vscode';

export default function useState(context: ExtensionContext) {
  return {
    get: () => {
      try {
        return JSON.parse(
          context.workspaceState.get('dataCruncher.state') || '{}',
        );
      } catch (e) {
        if (e instanceof SyntaxError) {
          return {};
        }
        throw e;
      }
    },
    set: (state: any) => {
      context.workspaceState.update(
        'dataCruncher.state',
        JSON.stringify(state),
      );
    },
  };
}
