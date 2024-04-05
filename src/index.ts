import { Players, RunService, Workspace } from "@rbxts/services";

export type Character<T extends Model> = T;

export class EasySwim {
	public IsEnabled: boolean = false;

	private Connection: RBXScriptConnection | undefined;
	private Attachments = new Array<Attachment>();
	private Forces = new Array<VectorForce>();

	private Player: Player;
	private Character: Character<Model>;
	private Humanoid: Humanoid;
	private HumanoidRootPart: BasePart;

	private updateHumanoidStates(activate: boolean, state: Enum.HumanoidStateType): void {
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.Running, activate);
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.RunningNoPhysics, activate);
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.GettingUp, activate);
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.Jumping, activate);
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.Freefall, activate);
		this.Humanoid.SetStateEnabled(Enum.HumanoidStateType.FallingDown, activate);
		this.Humanoid.ChangeState(state);
	}

	private updateGravity(state: boolean): LuaTuple<[Attachment, VectorForce]> | undefined {
		if (state) {
			if (this.Attachments.size() > 0 || this.Forces.size() > 0) return;
			const mass: number = this.HumanoidRootPart.AssemblyMass;

			const attachment = new Instance("Attachment");
			attachment.WorldAxis = this.HumanoidRootPart.Position;
			attachment.Parent = this.HumanoidRootPart;
			this.Attachments.push(attachment);

			const force = new Instance("VectorForce");
			force.RelativeTo = Enum.ActuatorRelativeTo.World;
			force.Force = new Vector3(0, Workspace.Gravity * mass, 0);
			force.Attachment0 = attachment;
			force.ApplyAtCenterOfMass = true;
			force.Parent = this.HumanoidRootPart;
			this.Forces.push(force);

			return $tuple(attachment, force);
		} else {
			this.Attachments.clear();
			this.Forces.clear();
			return;
		}
	}

	public constructor() {
		if (!RunService.IsClient()) this.Destroy();

		this.Player = Players.LocalPlayer;
		this.Character = this.Player.Character ?? (this.Player.CharacterAdded.Wait()[0] as Character<Model>);
		this.Humanoid = this.Character.FindFirstChildWhichIsA("Humanoid")!;
		this.HumanoidRootPart = this.Character.FindFirstChild("HumanoidRootPart", false) as BasePart;
	}

	public Start(): void {
		if (this.IsEnabled) return;

		this.updateHumanoidStates(false, Enum.HumanoidStateType.Swimming);
		const [, ,] = this.updateGravity(true)!;

		this.IsEnabled = true;

		this.Connection = RunService.Heartbeat.Connect(() => {
			if (this.Humanoid.MoveDirection.Magnitude > 0) return;
			this.HumanoidRootPart.AssemblyLinearVelocity = Vector3.zero;
		});
	}

	public Stop(): void {
		if (!this.IsEnabled) return;
		this.IsEnabled = false;

		this.updateHumanoidStates(true, Enum.HumanoidStateType.Freefall);
		this.updateGravity(false);

		if (typeIs(this.Connection, "RBXScriptConnection")) this.Connection.Disconnect();
	}

	public ClearAntiGravity(): void {
		this.updateGravity(false);
	}

	public CreateAntiGravity(): void {
		task.delay(1 / 20, () => {
			this.HumanoidRootPart.AssemblyLinearVelocity = Vector3.zero;
		});
		this.updateGravity(true);
	}

	public GetOut(): void {
		this.updateHumanoidStates(true, Enum.HumanoidStateType.Jumping);
	}

	public ActiveHumanoidStates(): void {
		this.updateHumanoidStates(false, Enum.HumanoidStateType.Swimming);
	}

	public Destroy(): void {
		this.Stop();
		table.clear(this);
		setmetatable(this, undefined!);
	}
}
