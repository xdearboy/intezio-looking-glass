import { useEffect } from 'react';
import { toBrailleTextContent } from './braille';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
]);

const LABEL_TAGS = new Set(['A', 'BUTTON', 'SUMMARY', 'LABEL']);

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest('[data-no-braille]')) return true;
  if (!node.nodeValue || node.nodeValue.trim().length === 0) return true;
  return false;
}

function preserveAccessibilityLabel(
  element: Element,
  labelStore: Map<HTMLElement, string | null>
): void {
  if (!(element instanceof HTMLElement)) return;

  const hasInteractiveRole =
    element.hasAttribute('role') &&
    ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'].includes(
      element.getAttribute('role') ?? ''
    );

  if (!LABEL_TAGS.has(element.tagName) && !hasInteractiveRole) {
    return;
  }

  if (element.hasAttribute('aria-label')) {
    return;
  }

  const sourceText = element.innerText?.trim();
  if (!sourceText) {
    return;
  }

  labelStore.set(element, null);
  element.setAttribute('aria-label', sourceText);
}

function applyToTree(
  root: Node,
  textStore: Map<Text, string>,
  labelStore: Map<HTMLElement, string | null>
): void {
  if (root instanceof Text) {
    if (shouldSkipTextNode(root)) return;
    if (textStore.has(root)) return;
    const original = root.nodeValue ?? '';
    textStore.set(root, original);
    root.nodeValue = toBrailleTextContent(original);
    return;
  }

  if (root instanceof Element) {
    preserveAccessibilityLabel(root, labelStore);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current: Node | null = walker.nextNode();

    while (current) {
      const textNode = current as Text;
      if (!shouldSkipTextNode(textNode) && !textStore.has(textNode)) {
        const original = textNode.nodeValue ?? '';
        textStore.set(textNode, original);
        textNode.nodeValue = toBrailleTextContent(original);
      }
      current = walker.nextNode();
    }
  }
}

export function useBrailleMode(enabled: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;

    root.classList.toggle('braille-mode', enabled);
    body.classList.toggle('braille-mode', enabled);
    body.dataset.accessibilityMode = enabled ? 'braille' : 'default';

    if (!enabled) {
      return () => {
        root.classList.remove('braille-mode');
        body.classList.remove('braille-mode');
        delete body.dataset.accessibilityMode;
      };
    }

    const originalTexts = new Map<Text, string>();
    const originalLabels = new Map<HTMLElement, string | null>();
    let isApplying = false;

    const applyNode = (node: Node): void => {
      applyToTree(node, originalTexts, originalLabels);
    };

    isApplying = true;
    applyNode(body);
    isApplying = false;

    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;
      isApplying = true;

      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData') {
            const textNode = mutation.target as Text;
            if (shouldSkipTextNode(textNode)) continue;

            const previousOriginal = originalTexts.get(textNode);
            if (previousOriginal !== undefined) {
              const expectedBraille = toBrailleTextContent(previousOriginal);
              if ((textNode.nodeValue ?? '') === expectedBraille) continue;
            }

            const nextOriginal = textNode.nodeValue ?? '';
            originalTexts.set(textNode, nextOriginal);
            textNode.nodeValue = toBrailleTextContent(nextOriginal);
            continue;
          }

          for (const addedNode of mutation.addedNodes) {
            applyNode(addedNode);
          }
        }
      } finally {
        isApplying = false;
      }
    });

    observer.observe(body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();

      for (const [node, original] of originalTexts.entries()) {
        if (!node.isConnected) continue;
        node.nodeValue = original;
      }

      for (const [element, original] of originalLabels.entries()) {
        if (!element.isConnected) continue;
        if (original === null) {
          element.removeAttribute('aria-label');
        } else {
          element.setAttribute('aria-label', original);
        }
      }

      root.classList.remove('braille-mode');
      body.classList.remove('braille-mode');
      delete body.dataset.accessibilityMode;
    };
  }, [enabled]);
}
