SaveColorMap = {}
setmetatable(SaveColorMap, {__index = HiveBaseModule})

SaveColorMap.new = function (varname)
    local this = HiveBaseModule.new(varname)
    setmetatable(this, {__index=SaveColorMap})
    this.saver = LoadModule("ColorMapSaver")
    return this
end

function SaveColorMap:executeSave()
    local v = self.value
    
    if v.rgba == nil or #v.rgba ~= (256 * 4) then
        return false
    end
	self.saver:SetMinValue(v.minval)
    self.saver:SetMaxValue(v.maxval)
    for i = 1, 256 * 4 do
        self.saver:SetRGBAValue(i - 1, v.rgba[i] / 0xFF);
    end
    
    if v.only_export then
        if HIVE_EXPORTMODE then
            return self.saver:Save(v.filepath)
        else
            return true
        end
    else
        return self.saver:Save(v.filepath)
    end
end

function SaveColorMap:Do()
    self:UpdateValue()
    
    if mpiMode() == true then
        if mpiRank() == 0 then
            return self:executeSave()
        end
    else
        return self:executeSave()
    end
end

