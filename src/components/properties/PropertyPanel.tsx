import React, { useState, useEffect } from "react";
import {
	X,
	Plus,
	Trash2,
	Key,
	Database,
	Link,
	Circle,
	AlertCircle,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import type {
	Entity,
	EntityAttribute,
	Cardinality,
	Participation,
	ConnectionPoint,
	ConnectionStyle,
	Diagram,
} from "../../types";
import {
	isValidEntityName,
	checkUniqueEntityName,
	checkUniqueRelationshipName,
	checkUniqueAttributeName,
} from "../../lib/validation";
import { showToast } from "../ui/toast";

export const PropertyPanel: React.FC = () => {
	const selectedIds = useEditorStore((state) => state.selectedIds);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const connections = useEditorStore((state) => state.diagram.connections);
	const generalizations = useEditorStore(
		(state) => state.diagram.generalizations,
	);
	const attributes = useEditorStore((state) => state.diagram.attributes);

	// Get the first selected element (for now, we only support single selection in property panel)
	const selectedId = selectedIds[0];

	// Don't show panel if nothing is selected or multiple items are selected
	if (!selectedId || selectedIds.length !== 1) {
		return null;
	}

	// Find entity, relationship, connection, generalization, or attribute directly from store (reactive)
	const entity = entities.find((e) => e.id === selectedId);
	const relationship = relationships.find((r) => r.id === selectedId);
	const connection = connections.find((c) => c.id === selectedId);
	const generalization = generalizations?.find((g) => g.id === selectedId);
	const attribute = attributes.find((a) => a.id === selectedId);

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

	// Handle generalization properties
	if (generalization) {
		return <GeneralizationPropertyPanel generalizationId={generalization.id} />;
	}

	// Handle attribute properties
	if (attribute) {
		return <AttributePropertyPanel attributeId={attribute.id} />;
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
		state.diagram.entities.find((e) => e.id === entityId),
	);
	const diagram = useEditorStore((state) => state.diagram);

	const updateEntity = useEditorStore((state) => state.updateEntity);
	const addAttribute = useEditorStore((state) => state.addAttribute);
	const updateAttribute = useEditorStore((state) => state.updateAttribute);
	const deleteAttribute = useEditorStore((state) => state.deleteAttribute);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	const [newAttributeName, setNewAttributeName] = useState("");
	const [localName, setLocalName] = useState(entity?.name || "");

	// Sync local name when entity changes
	useEffect(() => {
		if (entity) {
			setLocalName(entity.name);
		}
	}, [entity?.id, entity?.name]);

	// Don't render if entity not found
	if (!entity) {
		return null;
	}

	// Check for valid and unique name
	const isNameValid = isValidEntityName(localName);
	const isNameUnique = checkUniqueEntityName(entity.id, localName, diagram);
	const nameError = !isNameValid
		? "Entity name is required"
		: !isNameUnique
			? "An entity with this name already exists"
			: null;

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setLocalName(newName);

		// Only update store if name is valid and unique
		if (
			isValidEntityName(newName) &&
			checkUniqueEntityName(entity.id, newName, diagram)
		) {
			updateEntity(entity.id, { name: newName });
		}
	};

	const handleWeakEntityToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		updateEntity(entity.id, { isWeak: e.target.checked });
	};

	const handleAddAttribute = () => {
		if (newAttributeName.trim()) {
			addAttribute(entity.id, {
				name: newAttributeName.trim(),
				isKey: false,
				isPartialKey: false,
				isMultivalued: false,
				isDerived: false,
			});
			setNewAttributeName("");
		}
	};

	const handleAttributeUpdate = (
		attributeId: string,
		updates: Partial<EntityAttribute>,
	) => {
		updateAttribute(entity.id, attributeId, updates);
	};

	const handleDeleteAttribute = (attributeId: string) => {
		deleteAttribute(entity.id, attributeId);
	};

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Database className="w-5 h-5 text-blue-600" />
					<h2 className="text-lg font-semibold dark:text-gray-200">
						Entity Properties
					</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Entity Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Entity Name
					</label>
					<input
						type="text"
						value={localName}
						onChange={handleNameChange}
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
							nameError
								? "border-red-500 focus:ring-red-500 dark:border-red-500"
								: "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
						} dark:bg-gray-800 dark:text-gray-200`}
						placeholder="Enter entity name"
						required
					/>
					{nameError && (
						<p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
							<AlertCircle size={14} />
							{nameError}
						</p>
					)}
				</div>

				{/* Validation Warnings */}
				{entity.hasWarning && entity.warnings && entity.warnings.length > 0 && (
					<div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
						<div className="flex items-start gap-2">
							<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
									Validation Warnings
								</h4>
								<ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
									{entity.warnings.map((warning, index) => (
										<li key={index}>{warning}</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				)}

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
						className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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
						<span className="text-xs text-gray-500 dark:text-gray-400">
							{entity.attributes.length} attribute
							{entity.attributes.length !== 1 ? "s" : ""}
						</span>
					</div>

					{/* Attributes List */}
					<div className="space-y-2 mb-3">
						{entity.attributes.map((attr) => (
							<div
								key={attr.id}
								className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
										className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
													// If setting key, unset partial key
													isPartialKey: e.target.checked
														? false
														: attr.isPartialKey || false,
												})
											}
											className="w-3.5 h-3.5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
										/>
										<Key className="w-3.5 h-3.5 text-yellow-600" />
										<span className="text-gray-700 dark:text-gray-300">
											Key
										</span>
									</label>

									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isPartialKey || false}
											onChange={(e) =>
												handleAttributeUpdate(attr.id, {
													isPartialKey: e.target.checked,
													// If setting partial key, unset key
													isKey: e.target.checked ? false : attr.isKey,
												})
											}
											className="w-3.5 h-3.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
										/>
										<span className="text-gray-700 dark:text-gray-300">
											Partial Key
										</span>
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
										<span className="text-gray-700 dark:text-gray-300">
											Multivalued
										</span>
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
										<span className="text-gray-700 dark:text-gray-300">
											Derived
										</span>
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
		state.diagram.relationships.find((r) => r.id === relationshipId),
	);
	const entities = useEditorStore((state) => state.diagram.entities);
	const connections = useEditorStore((state) => state.diagram.connections);
	const diagram = useEditorStore((state) => state.diagram);

	const updateRelationship = useEditorStore(
		(state) => state.updateRelationship,
	);
	const updateConnection = useEditorStore((state) => state.updateConnection);
	const clearSelection = useEditorStore((state) => state.clearSelection);
	const [newAttributeName, setNewAttributeName] = useState("");
	const [localName, setLocalName] = useState(relationship?.name || "");

	// Sync local name when relationship changes
	useEffect(() => {
		if (relationship) {
			setLocalName(relationship.name);
		}
	}, [relationship?.id, relationship?.name]);

	// Don't render if relationship not found
	if (!relationship) {
		return null;
	}

	// Find the connection that links this relationship to the given entity (so diagram stays in sync)
	const getConnectionForEntity = (entityId: string) =>
		connections.find(
			(c) =>
				(c.fromId === relationship.id && c.toId === entityId) ||
				(c.fromId === entityId && c.toId === relationship.id),
		);

	// Check for unique name
	const isNameUnique = checkUniqueRelationshipName(
		relationship.id,
		localName,
		diagram,
	);
	const nameError = !isNameUnique
		? "A relationship with this name already exists"
		: null;

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setLocalName(newName);

		// Only update store if name is unique
		if (checkUniqueRelationshipName(relationship.id, newName, diagram)) {
			updateRelationship(relationship.id, { name: newName });
		}
	};

	// Get connected entities
	const connectedEntities = relationship.entityIds
		.map((id) => entities.find((e) => e.id === id))
		.filter(Boolean) as Entity[];

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Database className="w-5 h-5 text-purple-600" />
					<h2 className="text-lg font-semibold dark:text-gray-200">
						Relationship Properties
					</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Relationship Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Relationship Name
					</label>
					<input
						type="text"
						value={localName}
						onChange={handleNameChange}
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
							nameError
								? "border-red-500 focus:ring-red-500 dark:border-red-500"
								: "border-gray-300 dark:border-gray-600 focus:ring-purple-500"
						} dark:bg-gray-800 dark:text-gray-200`}
						placeholder="Enter relationship name"
					/>
					{nameError && (
						<p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
							<AlertCircle size={14} />
							{nameError}
						</p>
					)}
				</div>

				{/* Validation Warnings */}
				{relationship.hasWarning &&
					relationship.warnings &&
					relationship.warnings.length > 0 && (
						<div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
							<div className="flex items-start gap-2">
								<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
										Validation Warnings
									</h4>
									<ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
										{relationship.warnings.map((warning, index) => (
											<li key={index}>{warning}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

				{/* Weak Relationship */}
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="weak-relationship"
						checked={relationship.isWeak || false}
						onChange={(e) => {
							const checked = e.target.checked;
							if (checked) {
								const hasWeakEntity = connectedEntities.some(
									(ent) => ent.isWeak,
								);
								if (!hasWeakEntity) {
									showToast(
										"Identifying relationship must connect at least one weak entity. Mark one of the entities as weak first.",
										"warning",
									);
									return;
								}
							}
							updateRelationship(relationship.id, {
								isWeak: checked,
							});
						}}
						className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
					/>
					<label
						htmlFor="weak-relationship"
						className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
					>
						Weak Relationship (Identifying)
					</label>
				</div>

				{/* Attributes Section */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<label className="block text-sm font-medium text-gray-700">
							Attributes
						</label>
						<span className="text-xs text-gray-500 dark:text-gray-400">
							{relationship.attributes?.length || 0} attribute
							{(relationship.attributes?.length || 0) !== 1 ? "s" : ""}
						</span>
					</div>

					{/* Attributes List */}
					<div className="space-y-2 mb-3">
						{(relationship.attributes || []).map((attr) => (
							<div
								key={attr.id}
								className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<div className="flex items-start justify-between gap-2 mb-2">
									<input
										type="text"
										value={attr.name}
										onChange={(e) => {
											const updateRelationship =
												useEditorStore.getState().updateRelationship;
											updateRelationship(relationship.id, {
												attributes: relationship.attributes.map((a) =>
													a.id === attr.id ? { ...a, name: e.target.value } : a,
												),
											});
											// Also update canvas attribute
											const updateAttributeById =
												useEditorStore.getState().updateAttributeById;
											updateAttributeById(attr.id, { name: e.target.value });
										}}
										className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
										placeholder="Attribute name"
									/>
									<button
										onClick={() => {
											const updateRelationship =
												useEditorStore.getState().updateRelationship;
											updateRelationship(relationship.id, {
												attributes: relationship.attributes.filter(
													(a) => a.id !== attr.id,
												),
											});
											const deleteAttributeById =
												useEditorStore.getState().deleteAttributeById;
											deleteAttributeById(attr.id);
										}}
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
											onChange={(e) => {
												const updateRelationship =
													useEditorStore.getState().updateRelationship;
												updateRelationship(relationship.id, {
													attributes: relationship.attributes.map((a) =>
														a.id === attr.id
															? {
																	...a,
																	isKey: e.target.checked,
																	isPartialKey: e.target.checked
																		? false
																		: a.isPartialKey,
																}
															: a,
													),
												});
												const updateAttributeById =
													useEditorStore.getState().updateAttributeById;
												updateAttributeById(attr.id, {
													isKey: e.target.checked,
													isPartialKey: e.target.checked
														? false
														: attr.isPartialKey,
												});
											}}
											className="w-3.5 h-3.5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
										/>
										<Key className="w-3.5 h-3.5 text-yellow-600" />
										<span className="text-gray-700 dark:text-gray-300">
											Key
										</span>
									</label>
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isPartialKey || false}
											onChange={(e) => {
												const updateRelationship =
													useEditorStore.getState().updateRelationship;
												updateRelationship(relationship.id, {
													attributes: relationship.attributes.map((a) =>
														a.id === attr.id
															? {
																	...a,
																	isPartialKey: e.target.checked,
																	isKey: e.target.checked ? false : a.isKey,
																}
															: a,
													),
												});
												const updateAttributeById =
													useEditorStore.getState().updateAttributeById;
												updateAttributeById(attr.id, {
													isPartialKey: e.target.checked,
													isKey: e.target.checked ? false : attr.isKey,
												});
											}}
											className="w-3.5 h-3.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
										/>
										<span className="text-gray-700 dark:text-gray-300">
											Partial Key
										</span>
									</label>
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isMultivalued}
											onChange={(e) => {
												const updateRelationship =
													useEditorStore.getState().updateRelationship;
												updateRelationship(relationship.id, {
													attributes: relationship.attributes.map((a) =>
														a.id === attr.id
															? { ...a, isMultivalued: e.target.checked }
															: a,
													),
												});
												const updateAttributeById =
													useEditorStore.getState().updateAttributeById;
												updateAttributeById(attr.id, {
													isMultivalued: e.target.checked,
												});
											}}
											className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
										/>
										<span className="text-gray-700 dark:text-gray-300">
											Multivalued
										</span>
									</label>
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input
											type="checkbox"
											checked={attr.isDerived}
											onChange={(e) => {
												const updateRelationship =
													useEditorStore.getState().updateRelationship;
												updateRelationship(relationship.id, {
													attributes: relationship.attributes.map((a) =>
														a.id === attr.id
															? { ...a, isDerived: e.target.checked }
															: a,
													),
												});
												const updateAttributeById =
													useEditorStore.getState().updateAttributeById;
												updateAttributeById(attr.id, {
													isDerived: e.target.checked,
												});
											}}
											className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
										/>
										<span className="text-gray-700 dark:text-gray-300">
											Derived
										</span>
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
									const addRelationshipAttribute =
										useEditorStore.getState().addRelationshipAttribute;
									if (newAttributeName.trim()) {
										addRelationshipAttribute(relationship.id, {
											name: newAttributeName.trim(),
											isKey: false,
											isPartialKey: false,
											isMultivalued: false,
											isDerived: false,
										});
										setNewAttributeName("");
									}
								}
							}}
							className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
							placeholder="New attribute name"
						/>
						<button
							onClick={() => {
								const addRelationshipAttribute =
									useEditorStore.getState().addRelationshipAttribute;
								if (newAttributeName.trim()) {
									addRelationshipAttribute(relationship.id, {
										name: newAttributeName.trim(),
										isKey: false,
										isPartialKey: false,
										isMultivalued: false,
										isDerived: false,
									});
									setNewAttributeName("");
								}
							}}
							className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1"
							title="Add attribute"
						>
							<Plus className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Connected Entities */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Connected Entities
					</label>
					{connectedEntities.length > 0 ? (
						<div className="space-y-2">
							{connectedEntities.map((entity) => (
								<div
									key={entity.id}
									className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50 text-sm dark:text-gray-300"
								>
									{entity.name}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-500 italic">
							No entities connected yet.
						</p>
					)}
				</div>

				{/* Connection Details */}
				{connectedEntities.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Connection Details
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
										className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50"
									>
										<div className="font-medium text-sm mb-2">
											{entity.name}
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="block text-xs text-gray-600 mb-1">
													Cardinality
												</label>
												<select
													value={cardinality}
													onChange={(e) => {
														const newCardinality = e.target
															.value as Cardinality;
														updateRelationship(relationship.id, {
															cardinalities: {
																...relationship.cardinalities,
																[entity.id]: newCardinality,
															},
														});
														const conn = getConnectionForEntity(entity.id);
														if (conn) {
															updateConnection(conn.id, {
																cardinality: newCardinality,
															});
														}
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
														const newParticipation = e.target
															.value as Participation;
														updateRelationship(relationship.id, {
															participations: {
																...relationship.participations,
																[entity.id]: newParticipation,
															},
														});
														const conn = getConnectionForEntity(entity.id);
														if (conn) {
															updateConnection(conn.id, {
																participation: newParticipation,
															});
														}
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

interface EditableChildEntityRowProps {
	child: Entity;
	diagram: Diagram;
	onNameChange: (newName: string) => void;
}

const EditableChildEntityRow: React.FC<EditableChildEntityRowProps> = ({
	child,
	diagram,
	onNameChange,
}) => {
	const [localName, setLocalName] = useState(child.name);

	useEffect(() => {
		setLocalName(child.name);
	}, [child.id, child.name]);

	const isNameValid = isValidEntityName(localName);
	const isNameUnique = checkUniqueEntityName(child.id, localName, diagram);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setLocalName(newName);
		if (
			isValidEntityName(newName) &&
			checkUniqueEntityName(child.id, newName, diagram)
		) {
			onNameChange(newName);
		}
	};

	const hasError = !isNameValid || !isNameUnique;

	return (
		<>
			<input
				type="text"
				value={localName}
				onChange={handleChange}
				className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
					hasError
						? "border-red-500 focus:ring-red-500 dark:border-red-500"
						: "border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200"
				}`}
				placeholder="Entity name"
				required
			/>
			{!isNameValid && (
				<p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
					Entity name is required
				</p>
			)}
			{isNameValid && !isNameUnique && (
				<p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
					Duplicate name
				</p>
			)}
		</>
	);
};

interface GeneralizationPropertyPanelProps {
	generalizationId: string;
}

const GeneralizationPropertyPanel: React.FC<
	GeneralizationPropertyPanelProps
> = ({ generalizationId }) => {
	const generalization = useEditorStore((state) =>
		state.diagram.generalizations?.find((g) => g.id === generalizationId),
	);
	const diagram = useEditorStore((state) => state.diagram);
	const entities = useEditorStore((state) => state.diagram.entities);
	const updateEntity = useEditorStore((state) => state.updateEntity);
	const updateGeneralization = useEditorStore(
		(state) => state.updateGeneralization,
	);
	const deleteGeneralization = useEditorStore(
		(state) => state.deleteGeneralization,
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);

	if (!generalization) return null;

	const parentEntity = entities.find((e) => e.id === generalization.parentId);
	const childEntities = generalization.childIds
		.map((cid) => entities.find((e) => e.id === cid))
		.filter((e): e is Entity => !!e);

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col">
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-lg font-semibold dark:text-gray-200">
					Generalization (ISA)
				</h2>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Parent (Superclass)
					</label>
					{parentEntity ? (
						<EditableChildEntityRow
							child={parentEntity}
							diagram={diagram}
							onNameChange={(newName) =>
								updateEntity(parentEntity.id, { name: newName })
							}
						/>
					) : (
						<div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500">
							—
						</div>
					)}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Children (Subclasses)
					</label>
					<ul className="space-y-1">
						{childEntities.map((child) => (
							<li key={child.id}>
								<EditableChildEntityRow
									child={child}
									diagram={diagram}
									onNameChange={(newName) =>
										updateEntity(child.id, { name: newName })
									}
								/>
							</li>
						))}
					</ul>
				</div>
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
						Total participation
					</label>
					<label className="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={generalization.isTotal}
							onChange={(e) =>
								updateGeneralization(generalizationId, {
									isTotal: e.target.checked,
								})
							}
							className="sr-only peer"
						/>
						<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
						<span className="ms-3 text-sm text-gray-700 dark:text-gray-300">
							{generalization.isTotal ? "Yes" : "No"}
						</span>
					</label>
				</div>
				<button
					onClick={() => {
						deleteGeneralization(generalizationId);
						clearSelection();
					}}
					className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
				>
					<Trash2 className="w-4 h-4" />
					Delete Generalization
				</button>
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
		state.diagram.connections.find((c) => c.id === connectionId),
	);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);

	const updateConnection = useEditorStore((state) => state.updateConnection);
	const removeConnectionWaypoint = useEditorStore(
		(state) => state.removeConnectionWaypoint,
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
		e: React.ChangeEvent<HTMLSelectElement>,
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

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Link className="w-5 h-5 text-green-600" />
					<h2 className="text-lg font-semibold dark:text-gray-200">
						Connection Properties
					</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Connection Info */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Connection
					</label>
					<div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
						{fromElement?.name || "Unknown"} → {toElement?.name || "Unknown"}
					</div>
				</div>

				{/* Cardinality */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Cardinality
					</label>
					<select
						value={connection.cardinality}
						onChange={handleCardinalityChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value="1">1</option>
						<option value="N">N</option>
						<option value="M">M</option>
					</select>
				</div>

				{/* Participation */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Participation
					</label>
					<select
						value={connection.participation}
						onChange={handleParticipationChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value="partial">Partial</option>
						<option value="total">Total</option>
					</select>
				</div>

				{/* Connection Points */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Connection Points
					</label>
					<div className="space-y-2">
						<div>
							<label className="block text-xs text-gray-600 mb-1">
								From Point
							</label>
							<select
								value={connection.fromPoint}
								onChange={handleFromPointChange}
								className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
							>
								<option value="top">Top</option>
								<option value="right">Right</option>
								<option value="bottom">Bottom</option>
								<option value="left">Left</option>
								<option value="center">Center</option>
							</select>
						</div>
						<div>
							<label className="block text-xs text-gray-600 mb-1">
								To Point
							</label>
							<select
								value={connection.toPoint}
								onChange={handleToPointChange}
								className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
							>
								<option value="top">Top</option>
								<option value="right">Right</option>
								<option value="bottom">Bottom</option>
								<option value="left">Left</option>
								<option value="center">Center</option>
							</select>
						</div>
					</div>
				</div>

				{/* Connection Style */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Connection Style
					</label>
					<select
						value={connection.style}
						onChange={handleStyleChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
					>
						<option value="straight">Straight</option>
						<option value="curved">Curved</option>
						<option value="orthogonal">Orthogonal</option>
					</select>
				</div>

				{/* Waypoints */}
				{connection.waypoints && connection.waypoints.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Waypoints ({connection.waypoints.length})
						</label>
						<div className="space-y-2">
							{connection.waypoints.map((waypoint, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50 text-xs"
								>
									<span>
										({Math.round(waypoint.x)}, {Math.round(waypoint.y)})
									</span>
									<button
										onClick={() => {
											removeConnectionWaypoint(connection.id, index);
										}}
										className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
										title="Remove waypoint"
									>
										<Trash2 className="w-3 h-3" />
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

interface AttributePropertyPanelProps {
	attributeId: string;
}

const AttributePropertyPanel: React.FC<AttributePropertyPanelProps> = ({
	attributeId,
}) => {
	// Get attribute reactively from store
	const attribute = useEditorStore((state) =>
		state.diagram.attributes.find((a) => a.id === attributeId),
	);
	const entities = useEditorStore((state) => state.diagram.entities);
	const relationships = useEditorStore((state) => state.diagram.relationships);
	const diagram = useEditorStore((state) => state.diagram);

	const updateAttributeById = useEditorStore(
		(state) => state.updateAttributeById,
	);
	const clearSelection = useEditorStore((state) => state.clearSelection);
	const [localName, setLocalName] = useState(attribute?.name || "");

	// Sync local name when attribute changes
	useEffect(() => {
		if (attribute) {
			setLocalName(attribute.name);
		}
	}, [attribute?.id, attribute?.name]);

	// Don't render if attribute not found
	if (!attribute) {
		return null;
	}

	// Find parent element
	const parentEntity = attribute.entityId
		? entities.find((e) => e.id === attribute.entityId)
		: null;
	const parentRelationship = attribute.relationshipId
		? relationships.find((r) => r.id === attribute.relationshipId)
		: null;

	// Check for unique name within parent
	const isNameUnique = checkUniqueAttributeName(
		attribute.id,
		localName,
		attribute.entityId,
		attribute.relationshipId,
		diagram,
	);
	const nameError = !isNameUnique
		? "An attribute with this name already exists in the same parent"
		: null;

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value;
		setLocalName(newName);

		// Only update store if name is unique
		if (
			checkUniqueAttributeName(
				attribute.id,
				newName,
				attribute.entityId,
				attribute.relationshipId,
				diagram,
			)
		) {
			updateAttributeById(attribute.id, { name: newName });
		}
	};

	return (
		<div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Circle className="w-5 h-5 text-green-600" />
					<h2 className="text-lg font-semibold dark:text-gray-200">
						Attribute Properties
					</h2>
				</div>
				<button
					onClick={clearSelection}
					className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					title="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{/* Attribute Name */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Attribute Name
					</label>
					<input
						type="text"
						value={localName}
						onChange={handleNameChange}
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
							nameError
								? "border-red-500 focus:ring-red-500 dark:border-red-500"
								: "border-gray-300 dark:border-gray-600 focus:ring-green-500"
						} dark:bg-gray-800 dark:text-gray-200`}
						placeholder="Enter attribute name"
					/>
					{nameError && (
						<p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
							<AlertCircle size={14} />
							{nameError}
						</p>
					)}
				</div>

				{/* Validation Warnings */}
				{attribute.hasWarning &&
					attribute.warnings &&
					attribute.warnings.length > 0 && (
						<div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
							<div className="flex items-start gap-2">
								<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
										Validation Warnings
									</h4>
									<ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
										{attribute.warnings.map((warning, index) => (
											<li key={index}>{warning}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

				{/* Parent Element */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Parent Element
					</label>
					<div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-sm">
						{parentEntity
							? `Entity: ${parentEntity.name}`
							: parentRelationship
								? `Relationship: ${parentRelationship.name}`
								: "Unknown"}
					</div>
				</div>

				{/* Attribute Properties */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Properties
					</label>
					<div className="space-y-3">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={attribute.isKey}
								onChange={(e) => {
									updateAttributeById(attribute.id, {
										isKey: e.target.checked,
										isPartialKey: e.target.checked
											? false
											: attribute.isPartialKey,
									});
								}}
								className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
							/>
							<span className="text-sm text-gray-700">Key</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={attribute.isPartialKey || false}
								onChange={(e) => {
									updateAttributeById(attribute.id, {
										isPartialKey: e.target.checked,
										isKey: e.target.checked ? false : attribute.isKey,
									});
								}}
								className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
							/>
							<span className="text-sm text-gray-700">Partial Key</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={attribute.isMultivalued}
								onChange={(e) => {
									updateAttributeById(attribute.id, {
										isMultivalued: e.target.checked,
									});
								}}
								className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
							/>
							<span className="text-sm text-gray-700">Multivalued</span>
						</label>

						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={attribute.isDerived}
								onChange={(e) => {
									updateAttributeById(attribute.id, {
										isDerived: e.target.checked,
									});
								}}
								className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
							/>
							<span className="text-sm text-gray-700">Derived</span>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
};
