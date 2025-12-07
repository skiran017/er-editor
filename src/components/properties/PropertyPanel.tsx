import React, { useState } from "react";
import { X, Plus, Trash2, Key, Database, Link } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import type {
	Entity,
	EntityAttribute,
	Cardinality,
	Participation,
	ConnectionPoint,
	ConnectionStyle,
} from "../../types";

export const PropertyPanel: React.FC = () => {
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const connections = useEditorStore((state) => state.diagram.connections);

	// Get the first selected element (for now, we only support single selection in property panel)
	const selectedId = selectedIds[0];

	// Don't show panel if nothing is selected or multiple items are selected
	if (!selectedId || selectedIds.length !== 1) {
		return null;
	}

	// Find entity, relationship, or connection directly from store (reactive)
	const entity = entities.find((e) => e.id === selectedId);
	const relationship = relationships.find((r) => r.id === selectedId);
	const connection = connections.find((c) => c.id === selectedId);

	// Handle entity properties
	if (entity) {
		return <EntityPropertyPanel entityId={entity.id} />;
	}

	// Handle relationship properties
	if (relationship) {
		return <RelationshipPropertyPanel relationshipId={relationship.id} />;
	}

	// Handle connection properties
	if (connection) {
		return <ConnectionPropertyPanel connectionId={connection.id} />;
	}

	return null;
};

interface EntityPropertyPanelProps {
	entityId: string;
}

const EntityPropertyPanel: React.FC<EntityPropertyPanelProps> = ({
	entityId,
}) => {
	// Get entity reactively from store
	const entity = useEditorStore((state) =>
		state.diagram.entities.find((e) => e.id === entityId)
	);

	const updateEntity = useEditorStore((state) => state.updateEntity);
	const addAttribute = useEditorStore((state) => state.addAttribute);
	const updateAttribute = useEditorStore((state) => state.updateAttribute);
	const deleteAttribute = useEditorStore((state) => state.deleteAttribute);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	const [newAttributeName, setNewAttributeName] = useState("");

	// Don't render if entity not found
	if (!entity) {
		return null;
	}

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateEntity(entity.id, { name: e.target.value });
	};

	const handleWeakEntityToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateEntity(entity.id, { isWeak: e.target.checked });
	};

	const handleAddAttribute = () => {
		if (newAttributeName.trim()) {
			addAttribute(entity.id, {
				name: newAttributeName.trim(),
				isKey: false,
				isMultivalued: false,
				isDerived: false,
			});
			setNewAttributeName("");
		}
	};

	const handleAttributeUpdate = (
		attributeId: string,
		updates: Partial<EntityAttribute>
	) => {
		updateAttribute(entity.id, attributeId, updates);
	};

	const handleDeleteAttribute = (attributeId: string) => {
		deleteAttribute(entity.id, attributeId);
	};

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<Database className="w-5 h-5 text-blue-600" />
					<h2 className="text-lg font-semibold">Entity Properties</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Entity Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Entity Name
					</label>
					<input
						type="text"
						value={entity.name}
						onChange={handleNameChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Enter entity name"
					/>
				</div>

				{/* Weak Entity Toggle */}
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="weak-entity"
						checked={entity.isWeak}
						onChange={handleWeakEntityToggle}
						className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
					/>
					<label
						htmlFor="weak-entity"
						className="text-sm font-medium text-gray-700 cursor-pointer"
					>
						Weak Entity
					</label>
				</div>

				{/* Attributes Section */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<label className="block text-sm font-medium text-gray-700">
							Attributes
						</label>
						<span className="text-xs text-gray-500">
							{entity.attributes.length} attribute
							{entity.attributes.length !== 1 ? "s" : ""}
						</span>
					</div>

					{/* Attributes List */}
					<div className="space-y-2 mb-3">
						{entity.attributes.map((attr) => (
							<div
								key={attr.id}
								className="p-3 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
							>
								<div className="flex items-start justify-between gap-2 mb-2">
									<input
										type="text"
										value={attr.name}
										onChange={(e) =>
											handleAttributeUpdate(attr.id, {
												name: e.target.value,
											})
										}
										className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
										placeholder="Attribute name"
									/>
									<button
										onClick={() => handleDeleteAttribute(attr.id)}
										className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
										title="Delete attribute"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>

								{/* Attribute Properties */}
								<div className="flex flex-wrap gap-3 mt-2">
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isKey}
											onChange={(e) =>
												handleAttributeUpdate(attr.id, {
													isKey: e.target.checked,
												})
											}
											className="w-3.5 h-3.5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
										/>
										<Key className="w-3.5 h-3.5 text-yellow-600" />
										<span className="text-gray-700">Key</span>
									</label>

									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isMultivalued}
											onChange={(e) =>
												handleAttributeUpdate(attr.id, {
													isMultivalued: e.target.checked,
												})
											}
											className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
										/>
										<span className="text-gray-700">Multivalued</span>
									</label>

									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isDerived}
											onChange={(e) =>
												handleAttributeUpdate(attr.id, {
													isDerived: e.target.checked,
												})
											}
											className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
										/>
										<span className="text-gray-700">Derived</span>
									</label>
								</div>
							</div>
						))}
					</div>

					{/* Add Attribute */}
					<div className="flex gap-2">
						<input
							type="text"
							value={newAttributeName}
							onChange={(e) => setNewAttributeName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleAddAttribute();
								}
							}}
							className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="New attribute name"
						/>
						<button
							onClick={handleAddAttribute}
							className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
							title="Add attribute"
						>
							<Plus className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

interface RelationshipPropertyPanelProps {
	relationshipId: string;
}

const RelationshipPropertyPanel: React.FC<RelationshipPropertyPanelProps> = ({
	relationshipId,
}) => {
	// Get relationship reactively from store
	const relationship = useEditorStore((state) =>
		state.diagram.relationships.find((r) => r.id === relationshipId)
	);
	const entities = useEditorStore((state) => state.diagram.entities);

	const updateRelationship = useEditorStore(
		(state) => state.updateRelationship
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	// Don't render if relationship not found
	if (!relationship) {
		return null;
	}

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateRelationship(relationship.id, { name: e.target.value });
	};

	// Get connected entities
	const connectedEntities = relationship.entityIds
		.map((id) => entities.find((e) => e.id === id))
		.filter(Boolean) as Entity[];

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<Database className="w-5 h-5 text-purple-600" />
					<h2 className="text-lg font-semibold">Relationship Properties</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Relationship Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Relationship Name
					</label>
					<input
						type="text"
						value={relationship.name}
						onChange={handleNameChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
						placeholder="Enter relationship name"
					/>
				</div>

				{/* Connected Entities */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Connected Entities
					</label>
					{connectedEntities.length > 0 ? (
						<div className="space-y-2">
							{connectedEntities.map((entity) => (
								<div
									key={entity.id}
									className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
								>
									{entity.name}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-500 italic">
							No entities connected yet. (Connection system coming in step 2)
						</p>
					)}
				</div>

				{/* Cardinalities and Participations */}
				{connectedEntities.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Cardinalities & Participations
						</label>
						<div className="space-y-3">
							{connectedEntities.map((entity) => {
								const cardinality =
									relationship.cardinalities[entity.id] || "1";
								const participation =
									relationship.participations[entity.id] || "partial";

								return (
									<div
										key={entity.id}
										className="p-3 border border-gray-200 rounded-md bg-gray-50"
									>
										<div className="text-sm font-medium mb-2">
											{entity.name}
										</div>
										<div className="space-y-2">
											<div>
												<label className="block text-xs text-gray-600 mb-1">
													Cardinality
												</label>
												<select
													value={cardinality}
													onChange={(e) => {
														updateRelationship(relationship.id, {
															cardinalities: {
																...relationship.cardinalities,
																[entity.id]: e.target.value as Cardinality,
															},
														});
													}}
													className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
												>
													<option value="1">1</option>
													<option value="N">N</option>
													<option value="M">M</option>
												</select>
											</div>
											<div>
												<label className="block text-xs text-gray-600 mb-1">
													Participation
												</label>
												<select
													value={participation}
													onChange={(e) => {
														updateRelationship(relationship.id, {
															participations: {
																...relationship.participations,
																[entity.id]: e.target.value as Participation,
															},
														});
													}}
													className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
												>
													<option value="partial">Partial</option>
													<option value="total">Total</option>
												</select>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

interface ConnectionPropertyPanelProps {
	connectionId: string;
}

const ConnectionPropertyPanel: React.FC<ConnectionPropertyPanelProps> = ({
	connectionId,
}) => {
	// Get connection reactively from store
	const connection = useEditorStore((state) =>
		state.diagram.connections.find((c) => c.id === connectionId)
	);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);

	const updateConnection = useEditorStore((state) => state.updateConnection);
	const removeConnectionWaypoint = useEditorStore(
		(state) => state.removeConnectionWaypoint
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	// Don't render if connection not found
	if (!connection) {
		return null;
	}

	// Find from and to elements
	const fromElement =
		entities.find((e) => e.id === connection.fromId) ||
		relationships.find((r) => r.id === connection.fromId);
	const toElement =
		entities.find((e) => e.id === connection.toId) ||
		relationships.find((r) => r.id === connection.toId);

	const handleCardinalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		updateConnection(connection.id, {
			cardinality: e.target.value as Cardinality,
		});
	};

	const handleParticipationChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		updateConnection(connection.id, {
			participation: e.target.value as Participation,
		});
	};

	const handleFromPointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		updateConnection(connection.id, {
			fromPoint: e.target.value as ConnectionPoint,
		});
	};

	const handleToPointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		updateConnection(connection.id, {
			toPoint: e.target.value as ConnectionPoint,
		});
	};

	const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		updateConnection(connection.id, {
			style: e.target.value as ConnectionStyle,
		});
	};

	const handleRemoveWaypoint = (index: number) => {
		removeConnectionWaypoint(connection.id, index);
	};

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200">
				<div className="flex items-center gap-2">
					<Link className="w-5 h-5 text-blue-600" />
					<h2 className="text-lg font-semibold">Connection Properties</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Connection Info */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						From
					</label>
					<div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
						{fromElement
							? `${
									fromElement.type === "entity" ? "Entity" : "Relationship"
							  }: ${fromElement.name || "Unnamed"}`
							: "Unknown"}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						To
					</label>
					<div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
						{toElement
							? `${toElement.type === "entity" ? "Entity" : "Relationship"}: ${
									toElement.name || "Unnamed"
							  }`
							: "Unknown"}
					</div>
				</div>

				{/* Cardinality */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Cardinality
					</label>
					<select
						value={connection.cardinality}
						onChange={handleCardinalityChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="1">1</option>
						<option value="N">N</option>
						<option value="M">M</option>
					</select>
				</div>

				{/* Participation */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Participation
					</label>
					<select
						value={connection.participation}
						onChange={handleParticipationChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="partial">Partial</option>
						<option value="total">Total</option>
					</select>
				</div>

				{/* Connection Points */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						From Point
					</label>
					<select
						value={connection.fromPoint}
						onChange={handleFromPointChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="top">Top</option>
						<option value="right">Right</option>
						<option value="bottom">Bottom</option>
						<option value="left">Left</option>
						<option value="center">Center</option>
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						To Point
					</label>
					<select
						value={connection.toPoint}
						onChange={handleToPointChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="top">Top</option>
						<option value="right">Right</option>
						<option value="bottom">Bottom</option>
						<option value="left">Left</option>
						<option value="center">Center</option>
					</select>
				</div>

				{/* Connection Style */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Style
					</label>
					<select
						value={connection.style}
						onChange={handleStyleChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="straight">Straight</option>
						<option value="curved">Curved</option>
						<option value="orthogonal">Orthogonal</option>
					</select>
				</div>

				{/* Waypoints */}
				{connection.waypoints.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Waypoints ({connection.waypoints.length})
						</label>
						<div className="space-y-2">
							{connection.waypoints.map((waypoint, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded"
								>
									<span className="text-sm text-gray-600">
										Point {index + 1}: ({Math.round(waypoint.x)},{" "}
										{Math.round(waypoint.y)})
									</span>
									<button
										onClick={() => handleRemoveWaypoint(index)}
										className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
										title="Remove waypoint"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
