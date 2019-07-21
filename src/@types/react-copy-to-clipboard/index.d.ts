interface propTypes {
    text: String;
    children: React.ReactNode;
    onCopy?: Function;
    options?: {
      debug: Boolean;
      message: String;
    }
}

declare module "react-copy-to-clipboard" {
    import * as CustomModule from "react-copy-to-clipboard"

    export class CopyToClipboard extends React.PureComponent<propTypes> {}
}
