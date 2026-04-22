import { Background, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export const ERCanvas = () => {
  return (
    <ReactFlowProvider>
      <ReactFlow nodes={[]} edges={[]} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </ReactFlowProvider>
  )
}
