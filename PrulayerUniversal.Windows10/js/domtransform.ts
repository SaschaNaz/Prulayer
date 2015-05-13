module DOMTransform {
    type TransformingProcess = (element: Element) => any;
    type Transformer = { process: TransformingProcess, base?: string };

    let dictionary: { [key: string]: Transformer } = {};

    export function register(tagName: string, process: TransformingProcess) {
        dictionary[tagName.toLowerCase()] = { process };
    }

    export function registerAsExtension(extensionName: string, base: string, process: TransformingProcess) {
        base = base.toLowerCase()
        dictionary[extensionName.toLowerCase()] = { process, base };
    }

    export function construct(registeredName: string) {
        registeredName = registeredName.toLowerCase();
        let transformer = dictionary[registeredName];

        let element = document.createElement(transformer.base || registeredName);
        transformer.process(element);
        return element;
    }

    export function transform(blankElement: Node) {
        if (blankElement instanceof Element) {
            let tagName = blankElement.tagName.toLowerCase();
            let transformer = dictionary[tagName];
            if (!transformer)
                throw new Error(`No transformer is registered to treat ${tagName}`);

            transformer.process(blankElement);
            return blankElement;
        }
        throw new Error("The input is not an Element.");
    }

    export function extend(baseElement: Node, extensionName: string) {
        if (baseElement instanceof Element) {
            extensionName = extensionName.toLowerCase();

            let transformer = dictionary[extensionName];
            if (!transformer)
                throw new Error(`No transformer is registered to treat ${extensionName}`);
            
            // base coincidence check
            let baseTagName = baseElement.tagName.toLowerCase();
            if (transformer.base !== baseTagName)
                throw new Error(`The input base element is not instance of ${baseTagName}`);

            transformer.process(baseElement);
            return baseElement;
        }
        throw new Error("The input is not an Element.");
    }
}