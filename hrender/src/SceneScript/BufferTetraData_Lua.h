#ifndef _BUFFERTETRADATA_LUA_H_
#define _BUFFERTETRADATA_LUA_H_

#include "BufferTetraData.h"

class BufferTetraData_Lua : public BufferTetraData
{
public:
    BufferTetraData_Lua(BufferTetraData* vol) : BufferTetraData(vol) { }
    BufferTetraData_Lua() {}
    ~BufferTetraData_Lua() {}
    LUA_SCRIPTCLASS_BEGIN(BufferTetraData_Lua)
    LUA_SCRIPTCLASS_END();
};
LUA_SCRIPTCLASS_CAST_AND_PUSH(BufferTetraData_Lua);

#endif //_BUFFERTETRADATA_LUA_H_
