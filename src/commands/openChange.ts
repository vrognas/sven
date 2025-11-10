import { SourceControlResourceState, Uri } from "vscode";
import { Resource } from "../resource";
import IncomingChangeNode from "../treeView/nodes/incomingChangeNode";
import { Command } from "./command";

export class OpenChange extends Command {
  constructor(
    commandId: string,
    private readonly against: string
  ) {
    super(commandId);
  }

  public async execute(
    arg?: Resource | Uri | IncomingChangeNode,
    ...resourceStates: SourceControlResourceState[]
  ) {
    return this.openChange(arg, this.against, resourceStates);
  }
}
