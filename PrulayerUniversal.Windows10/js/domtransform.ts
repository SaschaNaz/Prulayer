module DOMTransform {
    type Transformer = (element: Element) => any;

    let dictionary: { [key: string]: Transformer } = {};

    export function register(tagName: string, transformer: Transformer) {
        dictionary[tagName.toLowerCase()] = transformer;
    }

    export function construct(tagName: string) {
        tagName = tagName.toLowerCase();
        let element = document.createElement(tagName);
        dictionary[tagName](element);
        return element;
    }

    export function transform(unknownElement: Node) {
        if (unknownElement instanceof Element) {
            let transformer = dictionary[unknownElement.tagName.toLowerCase()];
            if (!transformer)
                throw new Error(`No transformer is registered to treat ${unknownElement.tagName}`);

            transformer(unknownElement);
            return unknownElement;
        }
        throw new Error("The input is not an Element.");
    }
}